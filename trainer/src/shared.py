import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi.security import HTTPBearer
from fastapi import Depends, HTTPException

logging.basicConfig(
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
)


MODEL_CACHE_DIR = "/models"
LORA_MODEL_CACHE_DIR = "/models/loras2"


def merged_model_cache_dir(model_id: str) -> str:
    return f"{MODEL_CACHE_DIR}/{model_id}"


def lora_model_cache_dir(model_id: str) -> str:
    return f"{LORA_MODEL_CACHE_DIR}/{model_id}"


def lora_s3_path(base_model: str, fine_tune_id: str) -> str:
    return f"models/{base_model}:{fine_tune_id}:1"


def upload_file(client, local_path, bucket, s3_path):
    try:
        client.upload_file(local_path, bucket, s3_path)
        print(f"Successfully uploaded {s3_path}")
    except Exception as e:
        print(f"Error uploading {s3_path}: {e}")


def upload_directory_to_s3(local_directory, destination, bucket):
    import boto3

    client = boto3.client("s3")
    futures = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        for root, dirs, files in os.walk(local_directory):
            for filename in files:
                local_path = os.path.join(root, filename)
                relative_path = os.path.relpath(local_path, local_directory)
                s3_path = os.path.join(destination, relative_path)
                futures.append(
                    executor.submit(upload_file, client, local_path, bucket, s3_path)
                )

        for future in as_completed(futures):
            future.result()


def download_directory_from_s3(bucket, s3_prefix, local_directory):
    import boto3

    client = boto3.client("s3")
    futures = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        for key in client.list_objects(Bucket=bucket, Prefix=s3_prefix)["Contents"]:
            # Get the relative path by removing the s3_prefix from the key
            relative_path = key["Key"].replace(s3_prefix, "", 1).lstrip("/")
            local_path = os.path.join(local_directory, relative_path)

            # Create the necessary directories
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            futures.append(
                executor.submit(
                    client.download_file,
                    bucket,
                    key["Key"],
                    local_path,
                )
            )

        for future in as_completed(futures):
            future.result()


def require_auth(auth_credentials=Depends(HTTPBearer())):
    if auth_credentials.credentials != os.environ["AUTHENTICATED_SYSTEM_KEY"]:
        raise HTTPException(status_code=401, detail="Invalid authentication")
