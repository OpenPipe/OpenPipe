import yaml
import logging


base_llama2_config = {
    "model_type": "LlamaForCausalLM",
    "tokenizer_type": "LlamaTokenizer",
    "is_llama_derived_model": True,
    "load_in_8bit": True,
    "sequence_len": 4096,
    "sample_packing": True,
    "adapter": "lora",
    "lora_r": 32,
    "lora_alpha": 16,
    "lora_dropout": 0.05,
    "lora_target_linear": True,
    "gradient_accumulation_steps": 4,
    "micro_batch_size": 2,
    "optimizer": "adamw_bnb_8bit",
    "lr_scheduler": "cosine",
    "learning_rate": 0.0002,
    "train_on_inputs": False,
    "group_by_length": False,
    "bf16": True,
    "fp16": False,
    "tf32": False,
    "gradient_checkpointing": True,
    "flash_attention": True,
    "warmup_steps": 10,
    "weight_decay": 0.0,
    "special_tokens": {
        "bos_token": "<s>",
        "eos_token": "</s>",
        "unk_token": "<unk>",
    },
}

base_mistral_config = {
    "model_type": "MistralForCausalLM",
    "tokenizer_type": "LlamaTokenizer",
    "is_mistral_derived_model": True,
    "load_in_8bit": False,
    "load_in_4bit": True,
    "adapter": "qlora",
    "sequence_len": 8192,
    "sample_packing": True,
    "pad_to_sequence_len": True,
    "lora_r": 32,
    "lora_alpha": 16,
    "lora_dropout": 0.05,
    "lora_target_linear": True,
    "lora_target_modules": [
        "gate_proj",
        "down_proj",
        "up_proj",
        "q_proj",
        "v_proj",
        "k_proj",
        "o_proj",
    ],
    "gradient_accumulation_steps": 4,
    "micro_batch_size": 2,
    "optimizer": "adamw_bnb_8bit",
    "lr_scheduler": "cosine",
    "learning_rate": 0.0002,
    "train_on_inputs": False,
    "group_by_length": False,
    "bf16": True,
    "fp16": False,
    "tf32": False,
    "gradient_checkpointing": True,
    "flash_attention": True,
    "warmup_steps": 10,
    "weight_decay": 0.0,
    "special_tokens": {
        "bos_token": "<s>",
        "eos_token": "</s>",
        "unk_token": "<unk>",
    },
}


def write_config(
    config_path,
    base_model,
    architecture,
    num_epochs,
    training_file,
    out_path,
    wandb_project,
    wandb_run_id,
):
    if architecture == "MistralForCausalLM":
        config = base_mistral_config
    elif architecture == "LlamaForCausalLM":
        config = base_llama2_config
    else:
        raise ValueError(f"Unknown architecture {architecture}")

    config = config.copy()

    config["base_model"] = base_model
    config["base_model_config"] = base_model
    config["datasets"] = [
        {"path": training_file, "type": "alpaca_instruct.load_no_prompt"}
    ]

    # Modal throws errors if there are too many threads
    # running lol.
    config["dataset_processes"] = 8

    config["val_set_size"] = 0.05
    config["output_dir"] = out_path
    config["wandb_project"] = wandb_project
    config["wandb_run_id"] = wandb_run_id
    config["num_epochs"] = num_epochs
    config["logging_steps"] = 1
    config["save_safetensors"] = True
    config["eval_steps"] = 0.1
    config["strict"] = False
    config["save_strategy"] = "no"

    logging.info("Persisting config:")
    logging.info(config)
    yaml.dump(config, open(config_path, "w"))
