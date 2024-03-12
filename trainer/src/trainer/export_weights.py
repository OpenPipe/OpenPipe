from ..api_client.models.report_model_export_complete_json_body import (
    ReportModelExportCompleteJsonBody,
)
import modal
import os
import tempfile

from .base import stub
from ..shared import lora_s3_path, logging, download_directory_from_s3
from ..api import client

from ..api_client.api.default import get_model_export_info, report_model_export_complete


@stub.function(
    volumes={"/models": stub.volume},
    timeout=60 * 60 * 4,
    secrets=[modal.Secret.from_name("openpipe")],
    memory=100000,
)
async def do_export_weights(export_id: str, base_url: str):
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    import zipfile
    import boto3
    import torch

    logging.info(f"Beginning export process for model {export_id}")
    api_client = client(base_url)

    model_info = get_model_export_info.sync(
        client=api_client,
        export_id=export_id,
    )

    model_path = lora_s3_path(model_info.base_model, model_info.fine_tune_id)

    logging.info(
        f"Downloading model from {os.environ['USER_MODELS_BUCKET']}/{model_path}"
    )

    # Create temporary directory
    lora_dir = tempfile.mkdtemp()
    logging.info(f"Temporary directory created: {lora_dir}")

    download_directory_from_s3(
        bucket=os.environ["USER_MODELS_BUCKET"],
        s3_prefix=model_path,
        local_directory=lora_dir,
    )

    logging.info(f"Model downloaded to {lora_dir}")

    logging.info("Loading model")
    model = AutoModelForCausalLM.from_pretrained(
        model_info.base_model,
    )
    tokenizer = AutoTokenizer.from_pretrained(
        model_info.base_model,
    )

    model = PeftModel.from_pretrained(model, lora_dir)

    logging.info("Merging model")
    merged_dir = tempfile.mkdtemp()
    model = model.merge_and_unload()

    if model_info.weights_format == "bf16":
        logging.info("Converting model to bf16")
        model = model.bfloat16()
    elif model_info.weights_format == "fp16":
        logging.info("Converting model to fp16")
        model = model.half()
    else: # fp32
        logging.info("Converting model to fp32")
        model = model.float()

    model.save_pretrained(merged_dir)
    tokenizer.save_pretrained(merged_dir)

    logging.info("Model successfully merged")

    out_file = tempfile.mktemp(suffix=".zip")
    with zipfile.ZipFile(out_file, "w", zipfile.ZIP_STORED) as zipf:
        for file in os.listdir(merged_dir):
            file_path = os.path.join(merged_dir, file)
            if os.path.isfile(file_path):
                zipf.write(file_path, file)

    logging.info("Model successfully zipped")

    # Upload to S3
    s3_client = boto3.client("s3")

    s3_client.upload_file(out_file, model_info.s_3_bucket_name, model_info.s_3_key)

    s3_client.put_object_acl(
        ACL="public-read", Bucket=model_info.s_3_bucket_name, Key=model_info.s_3_key
    )

    logging.info("Model successfully uploaded to S3")

    report_model_export_complete.sync(
        client=api_client,
        json_body=ReportModelExportCompleteJsonBody(
            export_id=export_id,
        ),
    )

    logging.info("Model export complete")
