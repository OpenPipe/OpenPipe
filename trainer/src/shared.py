import logging

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)


def model_cache_dir(model_id: str, cache_dir: str = "/models") -> str:
    return f"{cache_dir}/{model_id}"
