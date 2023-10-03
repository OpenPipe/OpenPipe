import modal

from .api import (
    Input,
    Output,
    Choice,
    Usage,
)
from typing import Union
import os

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
    )
    .pip_install("vllm==0.2.0", "huggingface-hub==0.17.3", "hf-transfer~=0.1")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

volume = modal.Volume.from_name("openpipe-model-cache")

APP_NAME = "inference-server-v1"

stub = modal.Stub(APP_NAME, image=image)
stub.volume = volume

if stub.is_inside():
    from vllm import SamplingParams
    from vllm.utils import random_uuid
    from vllm.outputs import RequestOutput

    from vllm.engine.async_llm_engine import AsyncLLMEngine
    from vllm.engine.arg_utils import AsyncEngineArgs
    import logging

    logging.getLogger("vllm").setLevel(logging.ERROR)

    logging.basicConfig(
        format="[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=logging.INFO,
    )


def cache_model_weights(hf_model_id: str, cache_dir: str):
    from huggingface_hub import snapshot_download

    logging.info(f"Downloading model {hf_model_id}")

    if os.path.exists(cache_dir):
        logging.info("Model already downloaded.")

    else:
        os.makedirs(cache_dir, exist_ok=True)

        snapshot_download(
            hf_model_id, local_dir=cache_dir, local_dir_use_symlinks=False
        )
        stub.volume.commit()

        logging.info("Model downloaded.")


@stub.cls(
    gpu=modal.gpu.A100(memory=40, count=1),
    secret=modal.Secret.from_name("openpipe"),
    allow_concurrent_inputs=40,
    timeout=1 * 60 * 60,
    volumes={"/models": volume},
)
class Model:
    def __init__(self, huggingface_model_id: str):
        model_dir = f"/models/{huggingface_model_id}"
        cache_model_weights(huggingface_model_id, model_dir)

        logging.info(f"Loading model from volume {model_dir}")
        self.engine = AsyncLLMEngine.from_engine_args(AsyncEngineArgs(model=model_dir))

    @modal.method()
    async def generate(self, request: Input) -> Output:
        sample_params = SamplingParams(
            n=request.n,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        request_id = random_uuid()

        logging.info(f"Generating for request {request_id}")
        output_generator = self.engine.generate(
            request.prompt, sample_params, request_id=request_id
        )

        final_output: Union[RequestOutput, None] = None
        async for request_output in output_generator:
            # TODO: support streaming
            final_output = request_output

        if final_output is None:
            raise Exception("No output generated")

        prompt_tokens = len(final_output.prompt_token_ids)
        completion_tokens = sum(len(x.token_ids) for x in final_output.outputs)

        output = Output(
            id=request_id,
            choices=[
                Choice(text=choice.text, finish_reason=choice.finish_reason)
                for choice in final_output.outputs
            ],
            usage=Usage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
            ),
        )

        return output


@stub.function(timeout=1 * 60 * 60, allow_concurrent_inputs=500)
@modal.web_endpoint(method="POST", label=APP_NAME)
async def generate(request: Input) -> Output:
    logging.info(f"Generating for model {request.model}")
    model = Model(request.model)
    return await model.generate.remote.aio(request)
