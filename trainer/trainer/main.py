from dotenv import load_dotenv

load_dotenv()

from .shared import configured_client
from .api_client.api.default import get_training_info
from .api_client.models.get_training_info_response_200_base_model import (
    GetTrainingInfoResponse200BaseModel as BaseModel,
)

# from .train import train
from .write_config import write_config
from .deploy_baseten import deploy_baseten
from axolotl.cli.train import do_cli as do_train_cli
from axolotl.cli.merge_lora import do_cli as do_merge_lora_cli
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

import shutil
import os
import torch
import logging

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)

model_id = os.environ["FINE_TUNE_ID"]

logging.info(f"Beginning training process for model {model_id}")

training_info = get_training_info.sync(client=configured_client, fine_tune_id=model_id)

logging.info(f"Training info: {training_info.to_dict()}")

model_map = {
    BaseModel.LLAMA2_7B: "meta-llama/Llama-2-7b-hf",
    BaseModel.LLAMA2_13B: "meta-llama/Llama-2-13b-hf",
}

base_model = model_map[training_info.base_model]

# Use urllib to download the training data
import urllib.request

logging.info("Downloading training data")
training_file = "/tmp/train.jsonl"

urllib.request.urlretrieve(training_info.training_blob_download_url, training_file)

# Count the number of lines in the training data
num_lines = sum(1 for line in open(training_file))

# Target 10,000 training entries, but don't go under 1 or over 10 epochs.
num_epochs = min(max(1, int(10000 / num_lines + 0.5)), 10)

# # TODO remove, just to make testing faster
# num_epochs = 0.001

logging.info(f"Samples: {num_lines}, Epochs: {num_epochs}")

config_path = "/tmp/training-config.yaml"
lora_model_path = "/tmp/trained-model"
merged_model_path = "/tmp/merged-model"

# Clear the lora_model_path and merged_model_path directories
shutil.rmtree(lora_model_path, ignore_errors=True)
shutil.rmtree(merged_model_path, ignore_errors=True)

write_config(
    config_path,
    base_model,
    num_epochs,
    training_file,
    model_id,
    out_path=lora_model_path,
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
logging.info(f"Merging the model")
model = model.merge_and_unload()

# All this persisting and reloading shouldn't be necessary, but for some reason
# if I skip it the model doesn't load when we pull it from HuggingFace. Need to
# debug.
model.save_pretrained(merged_model_path)

logging.info("Reloading the merged model")
model = AutoModelForCausalLM.from_pretrained(merged_model_path)

logging.info("Pushing model to HuggingFace Hub")
model_hf_id = f"OpenPipe/openpipe-{model_id}"
model.push_to_hub(model_hf_id, private=True)


logging.info("Pushing tokenizer to HuggingFace")
tokenizer = AutoTokenizer.from_pretrained(lora_model_path)
tokenizer.push_to_hub(model_hf_id, private=True)

logging.info("Deploying to Baseten")
deploy_baseten(model_hf_id)
