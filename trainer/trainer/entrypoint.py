import modal

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

stub = modal.Stub("train-model", image=image)


@stub.function(
    gpu=modal.gpu.A100(memory=40, count=1),
    secret=modal.Secret.from_name("openpipe-prod"),
    # 8 hour timeout
    timeout=60 * 60 * 8,
)
def train(fine_tune_id: str, base_url: str, api_key: str):
    from .train import do_train

    do_train(fine_tune_id, base_url, api_key)


@stub.local_entrypoint()
def main(
    fine_tune_id: str,
    base_url: str,
    api_key: str,
):
    train.remote(fine_tune_id, base_url, api_key)
