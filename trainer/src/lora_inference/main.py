import modal

from .api import (
    Input,
    Output,
    Choice,
    Usage,
)
from typing import Union
from ..shared import merged_model_cache_dir, lora_model_cache_dir, require_auth
import fastapi
import logging
import os

logging.getLogger("vllm").setLevel(logging.ERROR)

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)


def cache_base_model_weights():
    from huggingface_hub import snapshot_download

    snapshot_download("OpenPipe/mistral-ft-optimized-1227")
    snapshot_download("mistralai/Mistral-7B-v0.1")
    snapshot_download("meta-llama/Llama-2-13b-hf")


vllm_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
    )
    .apt_install("git", "clang")
    .pip_install(
        "huggingface-hub==0.19.4",
        "hf-transfer~=0.1",
        "transformers==4.36.1",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1", "VLLM_INSTALL_PUNICA_KERNELS": "1"})
    .run_commands(
        "git clone https://github.com/Yard1/vllm.git /vllm",
        "cd /vllm && git checkout 4b2224e > /dev/null 2>&1",
        "pip3 install -e '/vllm'",
    )
    .run_function(cache_base_model_weights, secrets=[modal.Secret.from_name("openpipe")])
)


volume = modal.Volume.from_name("openpipe-model-cache")

APP_NAME = "lora-inference-v1"

stub = modal.Stub(APP_NAME)
stub.volume = volume
stub.vllm_image = vllm_image


MAX_INPUTS = 20

with vllm_image.imports():
    from vllm import SamplingParams
    from vllm.utils import random_uuid
    from vllm.outputs import RequestOutput

    from vllm.engine.async_llm_engine import AsyncLLMEngine
    from vllm.engine.arg_utils import AsyncEngineArgs
    from vllm.lora.request import LoRARequest


@stub.cls(
    gpu=modal.gpu.A100(memory=40, count=1),
    secrets=[modal.Secret.from_name("openpipe")],
    allow_concurrent_inputs=MAX_INPUTS,
    timeout=1 * 60 * 60,
    volumes={"/models": volume},
    # Make sure we have at least 100gb of system ram to cache S-LoRAs
    memory=100 * 1000,
    image=vllm_image,
    container_idle_timeout=300,
)
class LoraBaseModel:
    def __init__(self, base_model_id: str):
        model_dir = merged_model_cache_dir(base_model_id)
        logging.info(f"Loading base model {model_dir}")
        self.seen_models = set()

        self.engine = AsyncLLMEngine.from_engine_args(
            AsyncEngineArgs(
                model=base_model_id,
                enable_lora=True,
                max_loras=MAX_INPUTS,
                max_lora_rank=8,
                max_cpu_loras=500,
            )
        )

    @modal.method()
    async def generate(self, request: Input) -> Output:
        logging.info(f"Processing for model {request.lora_model}")
        lora_dir = lora_model_cache_dir(request.lora_model)

        if request.lora_model not in self.seen_models:
            if not os.path.exists(lora_model_cache_dir(request.lora_model)):
                logging.info(f"Couldn't find model, reloading {lora_dir}")
                stub.volume.reload()

            if not os.path.exists(lora_model_cache_dir(request.lora_model)):
                raise Exception(f"Couldn't find model {lora_dir}after reloading!")

            self.seen_models.add(request.lora_model)

        sample_params = SamplingParams(
            n=request.n,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        lora_request = LoRARequest(
            request.lora_model,
            abs(hash(request.lora_model)),
            lora_dir,
        )

        request_id = random_uuid()

        logging.info(f"Generating for request {request_id}")
        output_generator = self.engine.generate(
            request.prompt,
            sample_params,
            request_id=request_id,
            lora_request=lora_request,
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


web_app = fastapi.FastAPI(title=APP_NAME)


@stub.function(
    allow_concurrent_inputs=20,
    timeout=1 * 60 * 60,
    keep_warm=1,
    secrets=[modal.Secret.from_name("openpipe")],
)
@modal.asgi_app(label=APP_NAME)
def fastapi_app():
    return web_app


@web_app.post("/generate", operation_id="generate", response_model=Output)
async def chat_completion(
    request: Input, require_auth=fastapi.Depends(require_auth)
) -> Output:
    logging.info(f"Generating for model {request.lora_model}")
    model = LoraBaseModel(request.base_model)
    return await model.generate.remote.aio(request)
