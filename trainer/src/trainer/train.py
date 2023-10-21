from ..api_client.api.default import get_training_info
from ..api_client.models.get_training_info_response_200_base_model import (
    GetTrainingInfoResponse200BaseModel as BaseModel,
)
from ..api_client.client import AuthenticatedClient
from ..shared import model_cache_dir

from .write_config import write_config
from axolotl.cli.train import do_cli as do_train_cli
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

import shutil
import torch
import logging
import os

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)


def do_train(fine_tune_id: str, base_url: str, model_dir: str):
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

    model_map = {
        BaseModel.LLAMA2_7B: "meta-llama/Llama-2-7b-hf",
        BaseModel.LLAMA2_13B: "meta-llama/Llama-2-13b-hf",
        BaseModel.MISTRAL_7B: "mistralai/Mistral-7B-v0.1",
    }

    base_model = model_map[training_info.base_model]

    # Use urllib to download the training data
    import urllib.request

    logging.info("Downloading training data")
    training_file = "/tmp/train.jsonl"

    urllib.request.urlretrieve(training_info.training_data_url, training_file)

    # Count the number of lines in the training data
    num_lines = sum(1 for line in open(training_file))

    # Target 10,000 training entries, but don't go under 1 or over 10 epochs.
    num_epochs = min(max(1, int(10000 / num_lines + 0.5)), 10)

    logging.info(f"Samples: {num_lines}, Epochs: {num_epochs}")

    config_path = "/tmp/training-config.yaml"
    lora_model_path = "/tmp/trained-model"
    merged_model_path = model_cache_dir(training_info.hugging_face_model_id, model_dir)

    os.makedirs(merged_model_path, exist_ok=True)

    # Clear the lora_model_path and merged_model_path directories
    shutil.rmtree(lora_model_path, ignore_errors=True)
    shutil.rmtree(merged_model_path, ignore_errors=True)

    write_config(
        config_path=config_path,
        base_model=base_model,
        num_epochs=num_epochs,
        training_file=training_file,
        out_path=lora_model_path,
        wandb_project=f"OP {training_info.project_name}",
        wandb_run_id=training_info.model_slug
    )

    logging.info("Running training")
    do_train_cli(config_path)

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
    model.save_pretrained(merged_model_path)

    tokenizer = AutoTokenizer.from_pretrained(lora_model_path)
    tokenizer.save_pretrained(merged_model_path)
