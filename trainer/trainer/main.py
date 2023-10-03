import modal
from pydantic import BaseModel
import fastapi
import logging

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
    )
    .apt_install("git")
    .run_commands(
        "git clone https://github.com/OpenPipe/axolotl.git /axolotl",
        "cd /axolotl && git checkout a005c1b > /dev/null 2>&1",
        "pip install -e /axolotl",
    )
    .pip_install(
        "deepspeed==0.10.3", "flash-attn==2.2.4.post1", "httpx==0.24.1", "peft==0.5.0"
    )
)

APP_NAME = "trainer-v1"

stub = modal.Stub(APP_NAME, image=image)
stub.volume = modal.Volume.persisted("openpipe-model-cache")

web_app = fastapi.FastAPI()


@stub.function(
    gpu=modal.gpu.A100(memory=40, count=1),
    secret=modal.Secret.from_name("openpipe"),
    # 8 hour timeout
    timeout=60 * 60 * 8,
    volumes={"/models": stub.volume},
)
def train(fine_tune_id: str, base_url: str):
    from .train import do_train

    do_train(fine_tune_id, base_url, "/models")

    # Save the model to the cache volume
    logging.info("Persisting model cache")
    stub.volume.commit()

    return {"status": "done"}


@stub.function(allow_concurrent_inputs=500)
@modal.asgi_app(label=APP_NAME)
def fastapi_app():
    return web_app


class Input(BaseModel):
    fine_tune_id: str
    base_url: str


@web_app.post("/start_training")
async def start_training(input: Input):
    call = await train.spawn.aio(input.fine_tune_id, input.base_url)
    return fastapi.responses.JSONResponse({"call_id": call.object_id}, status_code=202)


@web_app.get("/training_status")
async def training_status(call_id: str):
    function_call = modal.functions.FunctionCall.from_id(call_id)
    try:
        output = function_call.get(timeout=0)
        return fastapi.responses.JSONResponse(output, status_code=200)
    except TimeoutError:
        return fastapi.responses.JSONResponse({"status": "running"}, status_code=202)
    except Exception as e:
        return fastapi.responses.JSONResponse(
            {"status": "error", "error": str(e)}, status_code=500
        )
