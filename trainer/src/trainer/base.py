import modal


def cache_model_weights():
    from huggingface_hub import snapshot_download

    # Images seem to be cached really efficiently on Modal so let's just save
    # all our base model weights to the image to make training faster.
    snapshot_download("OpenPipe/mistral-ft-optimized-1227")
    snapshot_download("mistralai/Mixtral-8x7B-Instruct-v0.1")
    snapshot_download("mistralai/Mistral-7B-Instruct-v0.2")

    # This one is rarely used and quite large so just skip
    # snapshot_download("meta-llama/Llama-2-13b-hf")

    print("Model weights cached")


image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.2.2-cudnn8-devel-ubuntu22.04",
        add_python="3.10",
    )
    .apt_install("git")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .pip_install(
        "huggingface-hub==0.20.3",
        "hf-transfer==0.1.5",
    )
    .run_function(cache_model_weights, secrets=[modal.Secret.from_name("openpipe")])
    .run_commands(
        "git clone https://github.com/OpenAccess-AI-Collective/axolotl.git /axolotl",
        "cd /axolotl && git checkout 2d65f47",
        "pip3 install -e '/axolotl'",
    )
    .pip_install(
        "torch==2.2.0",
        "deepspeed==0.13.1",
        "deepspeed-kernels==0.0.1.dev1698255861",
        "httpx==0.24.1",
        "boto3==1.34.8",
    )
    .pip_install(
        "flash-attn==2.5.0",
    )
    .apt_install("wget", "gzip")
    .run_commands(
        "wget -O firectl.gz https://storage.googleapis.com/fireworks-public/firectl/stable/linux-amd64.gz",
        "gunzip firectl.gz",
        "install -o root -g root -m 0755 firectl /usr/local/bin/firectl",
    )
)


APP_NAME = "trainer-v1"

stub = modal.Stub(APP_NAME, image=image)
stub.volume = modal.Volume.persisted("openpipe-model-cache")
stub.fireworks_auth_volume = modal.Volume.persisted("openpipe-fireworks-auth")
