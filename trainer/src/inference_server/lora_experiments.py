from typing import Union
import modal
from .main import volume, image, read_all_files
from ..shared import merged_model_cache_dir, lora_model_cache_dir

from .api import (
    Input,
    Output,
    Choice,
    Usage,
)

APP_NAME = "lora-experiments"

MODEL_ID = "OpenPipe/ft-development-afb33201-e3d1-4b5a-9b9a-fe00a385bee3-e2e-1"

BASE_MODEL = "OpenPipe/mistral-ft-optimized-1218"

stub = modal.Stub(APP_NAME, image=image)
stub.volume = volume

RUN_LORA = True

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

    lora_dir = lora_model_cache_dir(MODEL_ID)
    merged_dir = merged_model_cache_dir(MODEL_ID)

    if RUN_LORA:
        base_model = BASE_MODEL
    else:
        base_model = merged_model_cache_dir(MODEL_ID)

    read_all_files(merged_dir)
    read_all_files(lora_dir)

    logging.info(f"Loading base model {base_model}")
    engine = AsyncLLMEngine.from_engine_args(
        AsyncEngineArgs(
            model=base_model,
            enable_lora=RUN_LORA,
            max_loras=20,
            max_lora_rank=32,
            max_cpu_loras=100,
            max_num_seqs=20,
        )
    )


@stub.function(
    timeout=1 * 60 * 60,
    allow_concurrent_inputs=40,
    keep_warm=1,
    concurrency_limit=1,
    gpu=modal.gpu.A100(memory=40, count=1),
    # secret=modal.Secret.from_name("openpipe"),
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
    output_generator = engine.generate(
        request.prompt,
        sample_params,
        request_id=request_id,
        lora_request=LoRARequest("test", 1, lora_dir),
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
