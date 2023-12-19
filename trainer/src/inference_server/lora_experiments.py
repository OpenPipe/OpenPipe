import modal
from .main import image, volume
from ..shared import merged_model_cache_dir

from .api import (
    Input,
    Output,
    Choice,
    Usage,
)

APP_NAME = "lora-experiments"

TEST_MODEL_ID = "OpenPipe/ft-development-afb33201-e3d1-4b5a-9b9a-fe00a385bee3-e2e-1"

stub = modal.Stub(APP_NAME, image=image)
stub.volume = volume

with image.run_inside():
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

    model_dir = merged_model_cache_dir(TEST_MODEL_ID)


# def read_all_files(directory):
#     # Just open each file and read the whole thing into memory. This is a hack
#     # because Modal's `Volume` file system has really bad perf on first read,
#     # especially if you're grabbing just a piece at a time like SafeTensors
#     # does.
#     def read_file(file):
#         with open(file, "r") as f:
#             f.read()

#     with ThreadPoolExecutor() as executor:
#         for root, _, files in os.walk(directory):
#             for file in files:
#                 file_path = os.path.join(root, file)
#                 executor.submit(read_file, file_path)


@stub.function(
    timeout=1 * 60 * 60,
    allow_concurrent_inputs=500,
    keep_warm=1,
    concurrency_limit=1,
    gpu=modal.gpu.A100(memory=40, count=1),
    secret=modal.Secret.from_name("openpipe"),
    volumes={"/models": stub.volume},
)
@modal.web_endpoint(method="POST", label=APP_NAME)
async def generate(request: Input) -> Output:
    logging.info(f"Generating for model {request.model}")
    model = Model(request.model)
    return await model.generate.remote.aio(request)
