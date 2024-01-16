from typing import Union
import modal
from .main import volume, read_all_files
from ..shared import merged_model_cache_dir, lora_model_cache_dir

from .api import (
    Input,
    Output,
    Choice,
    Usage,
)

APP_NAME = "model-benchmark"


def cache_weights_in_image_weights():
    from huggingface_hub import snapshot_download

    snapshot_download("OpenPipe/mistral-ft-optimized-1227")


image = (
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
    .run_function(cache_weights_in_image_weights)
)


stub = modal.Stub(APP_NAME, image=image)
stub.volume = volume

# OpenPipe/ft-development-c71c7a20-1efe-419d-bc6c-b07999939980-exp-lora-r-c1486ef4-0, OpenPipe/ft-development-b6387052-c83e-49f5-8add-951e1bcc6c4d-exp-lora-r-c1486ef4-1, OpenPipe/ft-development-dfa177d6-06ce-4c92-9754-0d3d899476ed-exp-lora-r-c1486ef4-2, OpenPipe/ft-development-4101b4d7-86cf-47c9-9877-94b24d75d4ed-exp-lora-r-c1486ef4-3
# 0 -> r8, 1 -> r16, 2 -> r32, 3 -> r4
MODEL_ID = (
    "OpenPipe/ft-development-c71c7a20-1efe-419d-bc6c-b07999939980-exp-lora-r-c1486ef4-0"
)

TESTING_LORA = True

with image.run_inside():
    from vllm import SamplingParams
    from vllm.utils import random_uuid
    from vllm.outputs import RequestOutput

    from vllm.engine.async_llm_engine import AsyncLLMEngine
    from vllm.engine.arg_utils import AsyncEngineArgs
    from vllm.lora.request import LoRARequest

    import logging

    logging.basicConfig(
        format="[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=logging.INFO,
    )

    merged_model = merged_model_cache_dir(MODEL_ID)

    if TESTING_LORA:
        base_model = "OpenPipe/mistral-ft-optimized-1227"
        lora_args = {
            "enable_lora": True,
            "max_loras": 24,
            "max_lora_rank": 8,
            "max_cpu_loras": 100,
        }
    else:
        base_model = merged_model
        lora_args = {}

    engine = AsyncLLMEngine.from_engine_args(
        AsyncEngineArgs(
            model=base_model,
            **lora_args,
        )
    )


@stub.function(
    timeout=1 * 60 * 60,
    allow_concurrent_inputs=64,
    keep_warm=1,
    concurrency_limit=1,
    gpu=modal.gpu.A100(memory=40, count=1),
    secret=modal.Secret.from_name("openpipe"),
    volumes={"/models": stub.volume},
)
@modal.web_endpoint(method="POST", label=APP_NAME)
async def generate(request: Input) -> Output:
    logging.info(f"Generating for model {request.model}")

    sample_params = SamplingParams(
        n=request.n,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    )

    request_id = random_uuid()

    logging.info(f"Generating for request {request_id}")

    lora_request = None
    if TESTING_LORA:
        lora_request = LoRARequest(
            request.model, abs(hash(request.model)), lora_model_cache_dir(MODEL_ID)
        )

    output_generator = engine.generate(
        request.prompt,
        sample_params,
        request_id=request_id,
        lora_request=lora_request,
    )

    final_output: Union[RequestOutput, None] = None
    async for request_output in output_generator:
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
