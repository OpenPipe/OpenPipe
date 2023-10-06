import yaml


def write_config(
    config_path, base_model, num_epochs, training_file, model_id, out_path
):
    config = {
        "base_model": base_model,
        "base_model_config": base_model,
        "model_type": "LlamaForCausalLM",
        "tokenizer_type": "LlamaTokenizer",
        "is_llama_derived_model": True,
        "load_in_8bit": True,
        "strict": False,
        "datasets": [{"path": training_file, "type": "alpaca_instruct.load_no_prompt"}],
        "dataset_processes": 8,
        "val_set_size": 0.05,
        "output_dir": out_path,
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
        "eval_steps": 100,
        "weight_decay": 0.0,
        "special_tokens": {
            "bos_token": "<s>",
            "eos_token": "</s>",
            "unk_token": "<unk>",
        },
        "save_safetensors": True,
    }

    print("Saving config")
    yaml.dump(config, open(config_path, "w"))
