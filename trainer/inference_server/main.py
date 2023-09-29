import os

from modal import Image, Secret, Stub, gpu, web_endpoint

# import everything from .config
import inference_server.config as deploy_config
import inference_server.api as api
from typing import Union


def cache_model_weights():
    from huggingface_hub import snapshot_download
    import transformers

    print("Downloading model...")
    snapshot_download(deploy_config.hugging_face_model_id)

    transformers.utils.move_cache()

    print("Model downloaded.")


image = (
    Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
    )
    .pip_install("vllm==0.2.0", "huggingface-hub==0.17.3", "hf-transfer~=0.1")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    # This is a hack to force Modal to re-run the cache function whenever the model ID changes
    .env({"MODEL_ID": deploy_config.hugging_face_model_id})
    .run_function(
        cache_model_weights,
        secret=Secret.from_name("openpipe-prod"),
        timeout=60 * 20,
    )
)

stub = Stub(deploy_config.deploy_id, image=image)

if stub.is_inside():
    from vllm import SamplingParams
    from vllm.utils import random_uuid
    from vllm.outputs import RequestOutput

    from vllm.engine.async_llm_engine import AsyncLLMEngine
    from vllm.engine.arg_utils import AsyncEngineArgs
    import logging

    logging.getLogger("vllm").setLevel(logging.ERROR)


@stub.cls(
    gpu=gpu.A100(memory=40, count=1),
    secret=Secret.from_name("openpipe-prod"),
    allow_concurrent_inputs=deploy_config.requests_per_instance,
    keep_warm=deploy_config.min_gpus,
    concurrency_limit=1,  # TODO remove
)
class Model:
    def __enter__(self):
        self.engine = AsyncLLMEngine.from_engine_args(
            AsyncEngineArgs(model=deploy_config.hugging_face_model_id)
        )

    @web_endpoint(method="POST", label=deploy_config.deploy_id)
    async def generate(self, request: api.Input) -> api.Output:
        sample_params = SamplingParams(
            n=request.n,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        request_id = random_uuid()

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

        output = api.Output(
            id=request_id,
            choices=[
                api.Choice(text=choice.text, finish_reason=choice.finish_reason)
                for choice in final_output.outputs
            ],
            usage=api.Usage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
            ),
        )

        return output
