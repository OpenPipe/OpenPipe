import modal
from pydantic import BaseModel
import fastapi
from typing import Union, Literal

from .export_weights import do_export_weights

from .base import APP_NAME, image, stub
from ..shared import logging, require_auth

web_app = fastapi.FastAPI(title=APP_NAME)

with image.imports():
    from huggingface_hub import HfApi

    hf_api = HfApi()


@stub.function(
    gpu=modal.gpu.A100(memory=80, count=1),
    secrets=[modal.Secret.from_name("openpipe")],
    # 24 hour timeout
    timeout=60 * 60 * 24,
    volumes={"/models": stub.volume, "/root/.fireworks": stub.fireworks_auth_volume},
)
def train(fine_tune_id: str, base_url: str):
    from .train import do_train

    do_train(fine_tune_id, base_url)

    # Save the model to the cache volume
    logging.info("Persisting model cache")
    stub.volume.commit()
    logging.info("Cache persisted")

    return {"status": "done"}


@stub.function(
    allow_concurrent_inputs=500, secrets=[modal.Secret.from_name("openpipe")]
)
@modal.asgi_app(label=APP_NAME)
def fastapi_app():
    return web_app


class STOutput(BaseModel):
    call_id: str


@web_app.post("/start_training", operation_id="start_training", response_model=STOutput)
async def start_training(
    fine_tune_id: str, base_url: str, require_auth=fastapi.Depends(require_auth)
):
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
async def training_status(
    call_id: str, require_auth=fastapi.Depends(require_auth)
) -> TSOutput:
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


@web_app.post("/export_weights", operation_id="export_weights")
async def export_weights(
    export_id: str,
    base_url: str,
    require_auth=fastapi.Depends(require_auth),
):
    logging.info(f"Kicking off export for request {export_id}")
    call = await do_export_weights.spawn.aio(export_id, base_url)
    return fastapi.responses.JSONResponse({"call_id": call.object_id}, status_code=202)
