from axolotl.cli import (
    load_cfg,
    load_datasets,
)
from axolotl.common.cli import TrainerCliArgs
from axolotl.train import train as axolotl_train

import yaml
from transformers import HfArgumentParser


def train(base_model, num_epochs, training_file, model_id):
    lora_dir = "/tmp/trained-model"
    
    config = {
        "base_model": base_model,
        "base_model_config": base_model,
        "model_type": "LlamaForCausalLM",
        "tokenizer_type": "LlamaTokenizer",
        "is_llama_derived_model": True,
        "load_in_8bit": True,
        "strict": False,
        "datasets": [
            {"path": training_file, "type": "alpaca_instruct.load_no_prompt"}
        ],
        "val_set_size": 0.05,
        "output_dir": lora_dir,
        "sequence_len": 4096,
        "sample_packing": True,
        "adapter": "lora",
        "lora_r": 32,
        "lora_alpha": 16,
        "lora_dropout": 0.05,
        "lora_target_linear": True,
        "wandb_project": "axolotl",
        "wandb_run_id": model_id,
        "gradient_accumulation_steps": 4,
        "micro_batch_size": 2,
        "num_epochs": num_epochs,
        "optimizer": "adamw_bnb_8bit",
        "lr_scheduler": "cosine",
        "learning_rate": 0.0002,
        "train_on_inputs": False,
        "group_by_length": False,
        "bf16": True,
        "fp16": False,
        "tf32": False,
        "gradient_checkpointing": True,
        "logging_steps": 1,
        "flash_attention": True,
        "warmup_steps": 10,
        "eval_steps": 20,
        "weight_decay": 0.0,
        "special_tokens": {
            "bos_token": "<s>",
            "eos_token": "</s>",
            "unk_token": "<unk>",
        },
    }

    print("Saving config")
    yaml.dump(config, open("/workspace/training-config.yaml", "w"))

    print("Beginning training")

    # This part is adapted from axolotl/src/axolotl/cli/train.py
    parsed_cfg = load_cfg("/workspace/training-config.yaml")

    parser = HfArgumentParser((TrainerCliArgs))
    parsed_cli_args, _ = parser.parse_args_into_dataclasses(
        return_remaining_strings=True
    )

    print("Loading datasets")
    dataset_meta = load_datasets(cfg=parsed_cfg, cli_args=parsed_cli_args)

    print("Beginning training")
    model, tokenizer = axolotl_train(
        cfg=parsed_cfg, cli_args=parsed_cli_args, dataset_meta=dataset_meta
    )

    return model, tokenizer
