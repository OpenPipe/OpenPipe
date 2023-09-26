from dotenv import load_dotenv

load_dotenv()

from .shared import configured_client
from .api_client.api.default import get_training_info
from .api_client.models.get_training_info_response_200_base_model import GetTrainingInfoResponse200BaseModel as BaseModel
from .train import train

import os

model_id = os.environ["FINE_TUNE_ID"]

print(f"Beginning training process for model {model_id}")

training_info = get_training_info.sync(client=configured_client, fine_tune_id=model_id)

print(f"Training info: {training_info.to_dict()}")

model_map = {
  BaseModel.LLAMA2_7B: "meta-llama/Llama-2-7b-hf",
  BaseModel.LLAMA2_13B: "meta-llama/Llama-2-13b-hf",
}

base_model = model_map[training_info.base_model]

# Use urllib to download the training data
import urllib.request

print("Downloading training data")
training_file = "/tmp/train.jsonl"

urllib.request.urlretrieve(training_info.training_blob_download_url, training_file)

# Count the number of lines in the training data
num_lines = sum(1 for line in open(training_file))

# Target 10,000 training entries, but don't go under 1 or over 10 epochs.
num_epochs = min(max(1, int(10000 / num_lines + 0.5)), 10)

print(f"Samples: {num_lines}, Epochs: {num_epochs}")

model, tokenizer = train(
  base_model=base_model,
  num_epochs=num_epochs,
  training_file=training_file,
  model_id=model_id
)

print("Merging the model")
model = model.merge_and_unload()

print("Pushing model to HuggingFace")
model_hf_id = f"OpenPipe/openpipe-{model_id}"
model.push_to_hub(model_hf_id, private=True)

print("Pushing tokenizer to HuggingFace")
tokenizer.push_to_hub(model_hf_id, private=True)
