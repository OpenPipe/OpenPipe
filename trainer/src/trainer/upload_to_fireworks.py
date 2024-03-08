import json
import os
import logging
import subprocess
import time  # Added as per instructions


def upload_to_fireworks(
    fireworks_base_model: str,
    lora_model_path: str,
    fine_tune_id: str,
):
    """
    Attempts to upload to fireworks with a specified timeout and number of retries.
    :param fireworks_base_model: The base model for fireworks.
    :param lora_model_path: The path to the Lora model.
    :param fine_tune_id: The fine tune ID.
    """

    fireworks_json = {"base_model": fireworks_base_model}

    with open(os.path.join(lora_model_path, "fireworks.json"), "w") as f:
        json.dump(fireworks_json, f)

    adapter_config_path = os.path.join(lora_model_path, "adapter_config.json")
    with open(adapter_config_path, "r") as f:
        adapter_config = json.load(f)
        for key in ["use_rslora", "use_dora"]:  # Check for both keys
            if key in adapter_config:
                if adapter_config[key]:
                    raise Exception(
                        f"Fireworks does not support the {key} adapter config key"
                    )
                else:
                    del adapter_config[key]

    with open(adapter_config_path, "w") as f:
        json.dump(adapter_config, f)

    attempt = 0
    while True:
        if attempt > 3:
            raise Exception("Failed to upload to Fireworks after multiple attempts.")
        try:
            logging.info(f"Attempt {attempt + 1} of uploading to Fireworks.")
            subprocess.run(
                [
                    "firectl",
                    "create",
                    "model",
                    fine_tune_id,
                    lora_model_path,
                ],
                check=True,
                capture_output=True,
                timeout=300,
            )
            logging.info("Successfully uploaded to Fireworks.")
            break  # Break out of the loop if successful
        except subprocess.TimeoutExpired:
            logging.warning("Upload to Fireworks timed out after 300 seconds.")
        except subprocess.CalledProcessError as e:
            error = e.stderr.decode()
            if "code = AlreadyExists" in error:
                logging.info(
                    f"Model already exists in Fireworks. Considering as success. Error: {error}"
                )
                break
            else:
                logging.error(f"Failed to deploy to Fireworks: {error}")
                raise e
        attempt += 1

    ensure_model_deployed(fine_tune_id)


def deploy_model_with_retries(fireworks_model_name: str):
    """
    Deploys the model to Fireworks, retrying up to 3 times with a 30-second wait between tries.
    :param fireworks_model_name: The name of the model to deploy.
    """
    max_attempts = 3
    attempt = 0
    while attempt < max_attempts:
        try:
            logging.info(
                f"Attempting to deploy model {fireworks_model_name}, attempt {attempt + 1}."
            )
            subprocess.run(
                [
                    "firectl",
                    "deploy",
                    fireworks_model_name,
                ],
                check=True,
                capture_output=True,
                timeout=300,
            )
            logging.info(f"Successfully deployed model {fireworks_model_name}.")
            return
        except subprocess.CalledProcessError as e:
            logging.error(
                f"Failed to deploy model {fireworks_model_name}: {e.stderr.decode()}"
            )
            if attempt < max_attempts - 1:
                logging.info("Retrying after 30 seconds...")
                time.sleep(30)
            else:
                raise e
        attempt += 1


def ensure_model_deployed(fireworks_model_name: str):
    """
    Ensures the model is deployed in Fireworks by checking its status and deploying if necessary.
    :param fireworks_model_name: The name of the model in Fireworks.
    """
    while True:
        time.sleep(5)

        try:
            result = subprocess.run(
                ["firectl", "get", "model", fireworks_model_name, "--output=json"],
                check=True,
                capture_output=True,
                text=True,
            )
            deployment_status = json.loads(result.stdout)
            if deployment_status.get("state") == 5:
                logging.info(f"Model {fireworks_model_name} is successfully deployed.")
                break
            elif deployment_status.get("state") == 2:
                logging.info(
                    f"Model {fireworks_model_name} requires deployment. Deploying now..."
                )
                deploy_model_with_retries(fireworks_model_name)
            else:
                logging.info(
                    f"Model {fireworks_model_name} deployment status: {deployment_status.get('state')}, waiting..."
                )
        except subprocess.CalledProcessError as e:
            logging.error(f"Failed to check deployment status: {e.stderr.decode()}")
            raise e
