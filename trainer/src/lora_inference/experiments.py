import modal

from .api import (
    Input,
    Output,
    Choice,
    Usage,
)
from typing import Union
from ..shared import merged_model_cache_dir, lora_model_cache_dir
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

    snapshot_download("meta-llama/Llama-2-13b-hf")


vllm_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
    )
    .apt_install("git", "clang")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1", "VLLM_INSTALL_PUNICA_KERNELS": "1"})
    .pip_install(
        "huggingface-hub==0.19.4",
        "hf-transfer~=0.1",
        "transformers==4.37.2",
        "vllm==0.3.0",
    )
    .run_function(cache_base_model_weights, secret=modal.Secret.from_name("openpipe"))
)


volume = modal.Volume.from_name("openpipe-model-cache")

APP_NAME = "lora-inference-v1"

stub = modal.Stub(APP_NAME)
stub.volume = volume
stub.vllm_image = vllm_image


with vllm_image.run_inside():
    from vllm import SamplingParams
    from vllm.utils import random_uuid
    from vllm.outputs import RequestOutput

    from vllm.engine.async_llm_engine import AsyncLLMEngine
    from vllm.engine.arg_utils import AsyncEngineArgs
    from vllm.lora.request import LoRARequest

    print("Loading base model tps 2")
    engine = AsyncLLMEngine.from_engine_args(
        AsyncEngineArgs(
            model="meta-llama/Llama-2-13b-hf",
            # enable_lora=True,
            # max_loras=12,
            # max_lora_rank=8,
            # max_cpu_loras=500,
            tensor_parallel_size=2,
            enforce_eager=True,
        )
    )

    print("Base model loaded!")


@stub.function(
    gpu=modal.gpu.A10G(count=2),
    secret=modal.Secret.from_name("openpipe"),
    allow_concurrent_inputs=12,
    keep_warm=1,
    timeout=1 * 60 * 60,
    volumes={"/models": volume},
    image=vllm_image,
)
async def generate(self, request):
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

    # output = Output(
    #     id=request_id,
    #     choices=[
    #         Choice(text=choice.text, finish_reason=choice.finish_reason)
    #         for choice in final_output.outputs
    #     ],
    #     usage=Usage(
    #         prompt_tokens=prompt_tokens,
    #         completion_tokens=completion_tokens,
    #     ),
    # )

    # return output
