from ..api_client.api.default import get_training_info
from ..api_client.client import AuthenticatedClient
from ..shared import (
    lora_s3_path,
    lora_model_cache_dir,
    upload_directory_to_s3,
)
from .upload_to_fireworks import upload_to_fireworks


import shutil
import logging
import os
import subprocess
import urllib.request
import yaml

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)


def do_train(fine_tune_id: str, base_url: str):
    logging.info(f"Beginning training process for model {fine_tune_id}")

    training_info_resp = get_training_info.sync_detailed(
        client=AuthenticatedClient(
            base_url=base_url, token=os.environ["AUTHENTICATED_SYSTEM_KEY"]
        ),
        fine_tune_id=fine_tune_id,
    )

    if training_info_resp.status_code != 200:
        raise Exception(f"Failed to get training info: {training_info_resp}")

    training_info = training_info_resp.parsed
    if not training_info:
        raise Exception(f"Failed to get training info: {training_info_resp}")

    logging.info(f"Training info: {training_info.to_dict()}")

    logging.info("Downloading training data")
    training_file = "/tmp/train.jsonl"

    urllib.request.urlretrieve(training_info.training_data_url, training_file)

    config_path = "/tmp/training-config.yaml"
    lora_model_path = lora_model_cache_dir(fine_tune_id)

    os.makedirs(lora_model_path, exist_ok=True)

    # Clear the lora_model_path and merged_model_path directories
    shutil.rmtree(lora_model_path, ignore_errors=True)

    config = training_info.training_config
    config.datasets[0].path = training_file
    config.output_dir = lora_model_path

    training_yaml = yaml.dump(config.to_dict())
    print(f"Training config:\n{training_yaml}")
    with open(config_path, "w") as f:
        f.write(training_yaml)

    logging.info("Beginning training")
    try:
        # We have to run this in a subprocess instead of importing axolotl directly
        # because I haven't figured out how to free the GPU memory after training
        # and we get OOMs when we reload the peft model to merge it.
        subprocess.run(
            [
                "accelerate",
                "launch",
                "-m",
                "axolotl.cli.train",
                config_path,
            ],
            check=True,
        )
    except subprocess.CalledProcessError as e:
        logging.error(f"Training failed: {e}")
        raise e

    logging.info("Training complete. Uploading to S3.")
    upload_directory_to_s3(
        local_directory=lora_model_path,
        destination=lora_s3_path(config.base_model, fine_tune_id),
        bucket=os.environ["USER_MODELS_BUCKET"],
    )

    if training_info.fireworks_base_model:
        upload_to_fireworks(
            training_info.fireworks_base_model, lora_model_path, fine_tune_id
        )
