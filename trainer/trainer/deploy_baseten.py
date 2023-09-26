from dotenv import load_dotenv
import os
import shutil

load_dotenv()

import baseten
import logging
import yaml


def deploy_baseten(huggingface_id):
    baseten.login(os.environ["BASETEN_API_KEY"])

    config_dir = "/tmp/baseten"
    shutil.rmtree(config_dir, ignore_errors=True)
    os.mkdir(config_dir)

    config = {
        "build": {
            "arguments": {
                "endpoint": "Completions",
                "model": huggingface_id,
            },
            "model_server": "VLLM",
        },
        "environment_variables": {
            "HUGGING_FACE_HUB_TOKEN": os.environ["HUGGING_FACE_HUB_TOKEN"],
        },
        # "model_name": huggingface_id,
        "python_version": "py310",
        "resources": {
            "accelerator": "A100",
            "memory": "48Gi",
            "use_gpu": True,
        },
        "secrets": {
            "hf_access_token": None,
        },
        "hf_cache": [
            {
                "repo_id": huggingface_id,
            },
        ],
        "runtime": {"predict_concurrency": 25},
        "spec_version": "2.0",
        "system_packages": [],
    }

    yaml.dump(config, open(f"{config_dir}/config.yaml", "w"))

    truss = baseten.load_truss(config_dir)
    baseten.deploy_truss(
        truss,
        model_name=huggingface_id,
        is_trusted=True,
        publish=True,
    )
