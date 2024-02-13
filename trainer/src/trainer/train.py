from ..api_client.api.default import get_training_info
from ..api_client.client import AuthenticatedClient
from ..shared import (
    lora_s3_path,
    lora_model_cache_dir,
    upload_directory_to_s3,
)


import shutil
import logging
import os
import subprocess
import urllib.request
import yaml
import json

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)

def upload_to_fireworks(fireworks_base_model: str, lora_model_path: str, fine_tune_id: str, retries=3, timeout=300):
    """
    Attempts to upload to fireworks with a specified timeout and number of retries.
    :param fireworks_base_model: The base model for fireworks.
    :param lora_model_path: The path to the Lora model.
    :param fine_tune_id: The fine tune ID.
    :param retries: Number of retries before failing.
    :param timeout: Timeout in seconds for each upload attempt.
    """
    
    fireworks_json = {"base_model": fireworks_base_model}

    with open(os.path.join(lora_model_path, "fireworks.json"), "w") as f:
        json.dump(fireworks_json, f)
        
    adapter_config_path = os.path.join(lora_model_path, "adapter_config.json")
    with open(adapter_config_path, "r") as f:
        adapter_config = json.load(f)
        if "use_rslora" in adapter_config:
            if adapter_config["use_rslora"]:
                raise Exception(
                    "Fireworks does not support the use_rslora adapter config key"
                )
            else:
                del adapter_config["use_rslora"]

    with open(adapter_config_path, "w") as f:
        json.dump(adapter_config, f)
    
    attempt = 0
    while attempt < retries:
        try:
            logging.info(f"Attempt {attempt + 1} of uploading to Fireworks.")
            subprocess.run(
                [
                    "firectl",
                    "create",
                    "model",
                    fine_tune_id,
                    "--deploy",
                    "--wait",
                    lora_model_path,
                ],
                check=True,
                capture_output=True,
                timeout=timeout,  # Set timeout for subprocess
            )
            logging.info("Successfully uploaded to Fireworks.")
            return  # Exit function after successful upload
        except subprocess.TimeoutExpired:
            logging.warning(f"Upload to Fireworks timed out after {timeout} seconds.")
        except subprocess.CalledProcessError as e:
            if "code = AlreadyExists" in e.stderr.decode():
                logging.info("Model already exists in Fireworks. Considering as success.")
                return
            else:
                logging.error(f"Failed to deploy to Fireworks: {e.stderr.decode()}")
                raise e
        attempt += 1
    raise Exception("Failed to upload to Fireworks after multiple attempts.")

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
        upload_to_fireworks(training_info.fireworks_base_model, lora_model_path, fine_tune_id)
