from ..api_client.api.default import get_training_info
from ..api_client.client import AuthenticatedClient
from ..shared import (
    merged_model_cache_dir,
    lora_model_cache_dir,
    upload_directory_to_s3,
)

from .write_config import write_config
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

import shutil
import torch
import logging
import os
import subprocess
import urllib.request
from transformers import AutoConfig

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
    logging.info(f"Training info: {training_info.to_dict()}")

    base_model = training_info.base_model
    config = AutoConfig.from_pretrained(base_model)

    logging.info("Downloading training data")
    training_file = "/tmp/train.jsonl"

    urllib.request.urlretrieve(training_info.training_data_url, training_file)

    # Count the number of lines in the training data
    num_lines = sum(1 for line in open(training_file))

    # Target 10,000 training entries, but don't go under 1 or over 10 epochs.
    num_epochs = min(max(1, int(10000 / num_lines + 0.5)), 10)

    logging.info(f"Samples: {num_lines}, Epochs: {num_epochs}")

    config_path = "/tmp/training-config.yaml"
    lora_model_path = lora_model_cache_dir(training_info.hugging_face_model_id)
    merged_model_path = merged_model_cache_dir(training_info.hugging_face_model_id)

    os.makedirs(lora_model_path, exist_ok=True)
    os.makedirs(merged_model_path, exist_ok=True)

    # Clear the lora_model_path and merged_model_path directories
    shutil.rmtree(lora_model_path, ignore_errors=True)
    shutil.rmtree(merged_model_path, ignore_errors=True)

    write_config(
        config_path=config_path,
        base_model=base_model,
        architecture=config.architectures[0],
        num_epochs=num_epochs,
        training_file=training_file,
        out_path=lora_model_path,
        wandb_project=f"OP {training_info.project_name}",
        wandb_run_id=training_info.model_slug,
    )

    logging.info("Beginning training")
    try:
        # We have to run this in a subprocess instead of importing axolotl directly
        # because I haven't figured out how to free the GPU memory after training
        # and we get OOMs when we reload the peft model to merge it.
        subprocess.run(
            [
                "python",
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
        destination=f"models/{fine_tune_id}",
        bucket=os.environ["USER_MODELS_BUCKET"],
    )

    with torch.device("cuda:0"):
        logging.info("Reloading the base model")
        model = AutoModelForCausalLM.from_pretrained(
            base_model,
            return_dict=True,
            torch_dtype=torch.float16,
        )

        logging.info("Loading PEFT model")
        model = PeftModel.from_pretrained(model, lora_model_path)
        logging.info("Merging the model")
        model = model.merge_and_unload()

        logging.info(f"Saving the final model to {merged_model_path}")
        model.save_pretrained(merged_model_path, safe_serialization=True)

        logging.info("Saving the tokenizer")
        tokenizer = AutoTokenizer.from_pretrained(lora_model_path)
        tokenizer.save_pretrained(merged_model_path, safe_serialization=True)
