from openai import OpenAI, AsyncOpenAI
from openai.types.chat import ChatCompletion
import os
import pkg_resources
import json
from typing import Any, Dict, List, Union

from .api_client.client import OpenPipeApi, AsyncOpenPipeApi


def configure_openpipe_clients(
    reporting_client: Union[OpenPipeApi, AsyncOpenPipeApi],
    completions_client: Union[OpenAI, AsyncOpenAI],
    openpipe_options={},
):
    completions_client.base_url = "https://app.openpipe.ai/api/v1"
    if os.environ.get("OPENPIPE_API_KEY"):
        reporting_client._client_wrapper._token = os.environ["OPENPIPE_API_KEY"]
        completions_client.api_key = os.environ["OPENPIPE_API_KEY"]

    if os.environ.get("OPENPIPE_BASE_URL"):
        reporting_client._client_wrapper._base_url = os.environ["OPENPIPE_BASE_URL"]
        completions_client.base_url = os.environ["OPENPIPE_BASE_URL"]

    if openpipe_options and openpipe_options.get("api_key"):
        reporting_client._client_wrapper._token = openpipe_options["api_key"]
        completions_client.api_key = openpipe_options["api_key"]

    if openpipe_options and openpipe_options.get("base_url"):
        reporting_client._client_wrapper._base_url = openpipe_options["base_url"]
        completions_client.base_url = openpipe_options["base_url"]


def get_extra_headers(create_kwargs, openpipe_options):
    extra_headers = create_kwargs.pop("extra_headers", {})
    # Default to true
    if extra_headers.get("op-log-request", None) == None:
        extra_headers["op-log-request"] = (
            "false" if openpipe_options.get("log_request") == False else "true"
        )
    extra_headers["op-tags"] = json.dumps(_get_tags(openpipe_options))
    return extra_headers


def _get_tags(openpipe_options):
    tags = openpipe_options.get("tags") or {}
    tags["$sdk"] = "python"
    tags["$sdk.version"] = pkg_resources.get_distribution("openpipe").version

    return tags


def _should_log_request(
    configured_client: Union[OpenPipeApi, AsyncOpenPipeApi], openpipe_options={}
):
    if configured_client._client_wrapper._token == "":
        return False

    return openpipe_options.get("log_request", True)


def report(
    configured_client: OpenPipeApi,
    openpipe_options={},
    **kwargs,
):
    if not _should_log_request(configured_client, openpipe_options):
        return

    try:
        configured_client.report(
            **kwargs,
            tags=_get_tags(openpipe_options),
        )
    except Exception as e:
        # We don't want to break client apps if our API is down for some reason
        print(f"Error reporting to OpenPipe: {e}")
        print(e)


async def report_async(
    configured_client: AsyncOpenPipeApi,
    openpipe_options={},
    **kwargs,
):
    if not _should_log_request(configured_client, openpipe_options):
        return

    try:
        await configured_client.report(
            **kwargs,
            tags=_get_tags(openpipe_options),
        )
    except Exception as e:
        # We don't want to break client apps if our API is down for some reason
        print(f"Error reporting to OpenPipe: {e}")
        print(e)


def get_chat_completion_json(completion: ChatCompletion) -> Dict:
    """
    Converts a ChatCompletion object into a JSON object.
    Handles arrays and selectively includes None values for specified fields.

    Args:
    - completion (ChatCompletion): The ChatCompletion object to convert.

    Returns:
    - Dict: A JSON object representing the ChatCompletion object.
    """

    include_null_fields = {
        "content"
    }  # Set of fields to include even if they have None value

    def serialize(data: Any) -> Union[Dict, List]:
        """
        Custom serializer function for objects, arrays, and other types.
        Excludes fields with None values unless specified.
        """
        if isinstance(data, list) or isinstance(data, tuple):
            # Recursively process each element in the list or tuple
            return [serialize(item) for item in data]

        if hasattr(data, "__dict__"):
            # Otherwise, use the __dict__ method to get attributes
            data = data.__dict__
            # Filter out None values, except for specified fields
            return {
                key: serialize(value)
                if isinstance(value, (list, tuple, Dict))
                else value
                for key, value in data.items()
                if value is not None or key in include_null_fields
            }

        return data

    # Serialize the object and then load it back as a dictionary
    return json.loads(json.dumps(completion, default=serialize, indent=4))
