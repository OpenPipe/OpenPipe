import modal
from pydantic import BaseModel
import fastapi
from typing import Union, Literal
import os
from ..shared import merged_model_cache_dir, logging


def cache_model_weights():
    from huggingface_hub import snapshot_download

    # Images seem to be cached really efficiently on Modal so let's just save
    # all our base model weights to the image to make training faster.
    snapshot_download("OpenPipe/mistral-ft-optimized-1227")
    snapshot_download("mistralai/Mistral-7B-v0.1")
    snapshot_download("meta-llama/Llama-2-7b-hf")

    # This one is rarely used and quite large so just skip
    # snapshot_download("meta-llama/Llama-2-13b-hf")

    print("Model weights cached")


image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
    )
    .apt_install("git")
    .run_commands(
        "git clone https://github.com/OpenPipe/axolotl.git /axolotl",
        "cd /axolotl && git checkout 3848038 > /dev/null 2>&1",
        "pip3 install -e '/axolotl'",
    )
    .pip_install(
        "httpx==0.24.1",
        "huggingface-hub==0.19.4",
        "hf-transfer~=0.1",
        "flash-attn==2.3.3",
        "boto3==1.34.8",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(cache_model_weights, secret=modal.Secret.from_name("openpipe"))
)


APP_NAME = "trainer-v1"

stub = modal.Stub(APP_NAME, image=image)
stub.volume = modal.Volume.persisted("openpipe-model-cache")

web_app = fastapi.FastAPI(title=APP_NAME)

with image.run_inside():
    from huggingface_hub import HfApi

    hf_api = HfApi()


@stub.function(
    gpu=modal.gpu.A100(memory=40, count=1),
    secret=modal.Secret.from_name("openpipe"),
    # 24 hour timeout
    timeout=60 * 60 * 24,
    volumes={"/models": stub.volume},
)
def train(fine_tune_id: str, base_url: str):
    from .train import do_train

    do_train(fine_tune_id, base_url)

    # Save the model to the cache volume
    logging.info("Persisting model cache")
    stub.volume.commit()
    logging.info("Cache persisted")

    return {"status": "done"}


@stub.function(allow_concurrent_inputs=500)
@modal.asgi_app(label=APP_NAME)
def fastapi_app():
    return web_app


class STOutput(BaseModel):
    call_id: str


@web_app.post("/start_training", operation_id="start_training", response_model=STOutput)
async def start_training(fine_tune_id: str, base_url: str):
    call = await train.spawn.aio(fine_tune_id, base_url)
    return fastapi.responses.JSONResponse({"call_id": call.object_id}, status_code=202)


class TSOutput(BaseModel):
    status: Union[Literal["running"], Literal["done"], Literal["error"]]
    error: str = None


@web_app.get(
    "/training_status",
    operation_id="training_status",
    response_model=TSOutput,
)
async def training_status(call_id: str) -> TSOutput:
    function_call = modal.functions.FunctionCall.from_id(call_id)
    try:
        output = function_call.get(timeout=0)
        return fastapi.responses.JSONResponse(output, status_code=200)
    except TimeoutError:
        return fastapi.responses.JSONResponse({"status": "running"}, status_code=202)
    except Exception as e:
        return fastapi.responses.JSONResponse(
            {"status": "error", "error": str(e)}, status_code=200
        )


@stub.function(
    volumes={"/models": stub.volume},
    timeout=60 * 60 * 1,
    secret=modal.Secret.from_name("openpipe"),
)
async def do_persist_model_weights(model_name: str):
    logging.info(f"Backing up model weights for {model_name}")
    model_path = merged_model_cache_dir(model_name)

    # Check that the folder exists
    if not os.path.exists(model_path):
        raise Exception(f"Model path {model_path} does not exist")

    hf_api.create_repo(model_name, private=True, exist_ok=True)

    hf_api.upload_folder(
        repo_id=model_name,
        folder_path=model_path,
        commit_message="committed with do_persist_model_weights",
    )

    logging.info("Model weights successfully persisted to HuggingFace Hub")


@web_app.post("/persist_model_weights", operation_id="persist_model_weights")
async def persist_model_weights(model_name: str):
    logging.info(f"Kicking off persisting weights for model {model_name}")
    call = await do_persist_model_weights.spawn.aio(model_name)
    return fastapi.responses.JSONResponse({"call_id": call.object_id}, status_code=202)
