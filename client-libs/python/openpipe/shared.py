from openpipe.api_client.api.default import (
    report as api_report,
)
from openpipe.api_client.client import AuthenticatedClient
from openpipe.api_client.models.report_json_body_tags import (
    ReportJsonBodyTags,
)
from openai.types.chat import ChatCompletion
import os
import pkg_resources
import json
from typing import Any, Dict, List, Union


def configure_openpipe_client(openpipe_options={}) -> AuthenticatedClient:
    configured_client = AuthenticatedClient(
        base_url="https://app.openpipe.ai/api/v1",
        token="",
        raise_on_unexpected_status=True,
    )

    if os.environ.get("OPENPIPE_API_KEY"):
        configured_client.token = os.environ["OPENPIPE_API_KEY"]

    if os.environ.get("OPENPIPE_BASE_URL"):
        configured_client._base_url = os.environ["OPENPIPE_BASE_URL"]

    if openpipe_options and "verify_ssl" in openpipe_options:
        configured_client._verify_ssl = bool(openpipe_options["verify_ssl"])
    if openpipe_options and openpipe_options.get("api_key"):
        configured_client.token = openpipe_options["api_key"]
    if openpipe_options and openpipe_options.get("base_url"):
        configured_client._base_url = openpipe_options["base_url"]

    return configured_client


def _get_tags(openpipe_options):
    tags = openpipe_options.get("tags") or {}
    tags["$sdk"] = "python"
    tags["$sdk.version"] = pkg_resources.get_distribution("openpipe").version

    return ReportJsonBodyTags.from_dict(tags)


def _should_log_request(configured_client: AuthenticatedClient, openpipe_options={}):
    if configured_client.token == "":
        return False

    return openpipe_options.get("log_request", True)


def report(
    configured_client: AuthenticatedClient,
    openpipe_options={},
    **kwargs,
):
    if not _should_log_request(configured_client, openpipe_options):
        return

    try:
        api_report.sync_detailed(
            client=configured_client,
            json_body=api_report.ReportJsonBody(
                **kwargs,
                tags=_get_tags(openpipe_options),
            ),
        )
    except Exception as e:
        # We don't want to break client apps if our API is down for some reason
        print(f"Error reporting to OpenPipe: {e}")
        print(e)


async def report_async(
    configured_client: AuthenticatedClient,
    openpipe_options={},
    **kwargs,
):
    if not _should_log_request(configured_client, openpipe_options):
        return

    try:
        await api_report.asyncio_detailed(
            client=configured_client,
            json_body=api_report.ReportJsonBody(
                **kwargs,
                tags=_get_tags(openpipe_options),
            ),
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
