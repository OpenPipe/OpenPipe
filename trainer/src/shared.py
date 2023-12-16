import logging

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)


MODEL_CACHE_DIR = "/models"
LORA_MODEL_CACHE_DIR = "/models/loras"

def merged_model_cache_dir(model_id: str) -> str:
    return f"{MODEL_CACHE_DIR}/{model_id}"

def lora_model_cache_dir(model_id: str) -> str:
    return f"{LORA_MODEL_CACHE_DIR}/{model_id}"