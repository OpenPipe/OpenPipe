# from .train import train
from .shared import configured_client
from .api_client.api.default import get_training_info

import os

model_id = os.environ["FINE_TUNE_ID"]

print(f"Beginning training process for model {model_id}")
print("Downloading training data")

training_info = get_training_info.sync(client=configured_client, fine_tune_id=model_id)

print(f"Training info: {training_info}")

base_model = "meta-llama/Llama-2-7b-hf"
lora_dir = "/workspace/trained-model"

num_epochs = 0.002

model, tokenizer = train(base_model, num_epochs)

print("Merging the model")
model = model.merge_and_unload()

print("Pushing model to HuggingFace")
model_hf_id = f"OpenPipe/openpipe-{model_id}"
model.push_to_hub(model_hf_id, private=True)

print("Pushing tokenizer to HuggingFace")
tokenizer.push_to_hub(model_hf_id, private=True)
