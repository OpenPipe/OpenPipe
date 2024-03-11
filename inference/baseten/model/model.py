import logging
from pydantic import BaseModel, Field
from typing import List, Literal, Union
import os
import boto3
from vllm import SamplingParams
from vllm.utils import random_uuid
from vllm.outputs import RequestOutput
from concurrent.futures import ThreadPoolExecutor, as_completed

from vllm.engine.async_llm_engine import AsyncLLMEngine
from vllm.engine.arg_utils import AsyncEngineArgs
from vllm.lora.request import LoRARequest


class Choice(BaseModel):
    text: str
    finish_reason: Literal["stop", "length"]


class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int


class Input(BaseModel):
    base_model: str
    lora_model: str
    prompt: str
    n: int = Field(1, alias="n")
    max_tokens: int = Field(4096, alias="max_tokens")
    temperature: float = Field(0.0, alias="temperature")


class Output(BaseModel):
    id: str
    choices: List[Choice]
    usage: Usage


def lora_s3_path(base_model: str, fine_tune_id: str) -> str:
    return f"models/{base_model}:{fine_tune_id}:1"


def lora_model_cache_dir(lora_model: str) -> str:
    return f"/mnt/lora_cache/{lora_model}"


s3_client = boto3.client("s3")


def download_directory_from_s3(bucket, s3_prefix, local_directory):
    futures = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        for key in s3_client.list_objects(Bucket=bucket, Prefix=s3_prefix)["Contents"]:
            # Get the relative path by removing the s3_prefix from the key
            relative_path = key["Key"].replace(s3_prefix, "", 1).lstrip("/")
            local_path = os.path.join(local_directory, relative_path)

            # Create the necessary directories
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            futures.append(
                executor.submit(
                    s3_client.download_file,
                    bucket,
                    key["Key"],
                    local_path,
                )
            )

        for future in as_completed(futures):
            future.result()


class Model:
    def __init__(self, **kwargs):
        os.environ["HF_TOKEN"] = kwargs["secrets"]["hf_access_token"]

        os.environ["AWS_ACCESS_KEY_ID"] = kwargs["secrets"]["aws_access_key_id"]
        os.environ["AWS_SECRET_ACCESS_KEY"] = kwargs["secrets"]["aws_secret_access_key"]
        os.environ["AWS_DEFAULT_REGION"] = kwargs["secrets"][
            "user_models_bucket_region"
        ]
        self.user_models_bucket_name = kwargs["secrets"]["user_models_bucket_name"]

        self.base_model = kwargs["config"]["model_metadata"]["model"]

        self._data_dir = kwargs["data_dir"]

        self.downloaded_loras = set()

    def load(self) -> None:
        logging.getLogger("vllm").setLevel(logging.ERROR)

        logging.basicConfig(
            format="[%(asctime)s] [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            level=logging.INFO,
        )

        self.engine = AsyncLLMEngine.from_engine_args(
            AsyncEngineArgs(
                model=self.base_model,
                enable_lora=True,
                max_loras=24,
                max_lora_rank=8,
                max_cpu_loras=500,
            )
        )

    async def generate(self, request: Input) -> Output:
        logging.info(f"Processing for model {request.lora_model}")
        lora_dir = self._data_dir / request.lora_model

        if request.lora_model not in self.downloaded_loras:
            download_directory_from_s3(
                self.user_models_bucket_name,
                lora_s3_path(request.base_model, request.lora_model),
                lora_model_cache_dir(request.lora_model),
            )

            self.downloaded_loras.add(request.lora_model)

        sample_params = SamplingParams(
            n=request.n,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        lora_request = LoRARequest(
            request.lora_model,
            abs(hash(request.lora_model)),
            lora_dir,
        )

        request_id = random_uuid()

        logging.info(f"Generating for request {request_id}")
        output_generator = self.engine.generate(
            request.prompt,
            sample_params,
            request_id=request_id,
            lora_request=lora_request,
        )

        final_output: Union[RequestOutput, None] = None
        async for request_output in output_generator:
            # TODO: support streaming
            final_output = request_output

        if final_output is None:
            raise Exception("No output generated")

        prompt_tokens = len(final_output.prompt_token_ids)
        completion_tokens = sum(len(x.token_ids) for x in final_output.outputs)

        output = Output(
            id=request_id,
            choices=[
                Choice(text=choice.text, finish_reason=choice.finish_reason)
                for choice in final_output.outputs
            ],
            usage=Usage(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
            ),
        )

        return output
