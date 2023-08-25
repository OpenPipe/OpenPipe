import yaml
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from peft import PeftModel
import os


def merge_lora_model(config_file: str):
    config = yaml.load(open(config_file, "r"), Loader=yaml.FullLoader)

    base_model = config["base_model"]
    lora_model = config["output_dir"]
    merged_model = f"{lora_model}/merged"

    if os.path.exists(merged_model):
        print(f"Model {merged_model} already exists, skipping")
        return merged_model

    print("Loading base model")
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        return_dict=True,
        torch_dtype=torch.float16,
    )

    print("Loading PEFT model")
    model = PeftModel.from_pretrained(model, lora_model)
    print(f"Running merge_and_unload")
    model = model.merge_and_unload()

    tokenizer = AutoTokenizer.from_pretrained(base_model)

    model.save_pretrained(merged_model)
    tokenizer.save_pretrained(merged_model)
    print(f"Model saved to {merged_model}")

    return merged_model
