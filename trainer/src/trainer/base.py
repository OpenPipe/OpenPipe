import modal


def cache_model_weights():
    from huggingface_hub import snapshot_download

    # Images seem to be cached really efficiently on Modal so let's just save
    # all our base model weights to the image to make training faster.
    snapshot_download("OpenPipe/mistral-ft-optimized-1227")
    snapshot_download("mistralai/Mistral-7B-v0.1")

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
