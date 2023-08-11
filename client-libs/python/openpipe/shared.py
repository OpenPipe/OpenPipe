from openpipe.api_client.api.default import external_api_report
from openpipe.api_client.client import AuthenticatedClient
from openpipe.api_client.models.external_api_report_json_body_tags import (
    ExternalApiReportJsonBodyTags,
)
import toml

version = toml.load("pyproject.toml")["tool"]["poetry"]["version"]

configured_client = AuthenticatedClient(
    base_url="https://app.openpipe.ai/api/v1", token=""
)


def _get_tags(openpipe_options):
    tags = openpipe_options.get("tags") or {}
    tags["$sdk"] = "python"
    tags["$sdk_version"] = version

    return ExternalApiReportJsonBodyTags.from_dict(tags)


def report(
    openpipe_options={},
    **kwargs,
):
    try:
        external_api_report.sync_detailed(
            client=configured_client,
            json_body=external_api_report.ExternalApiReportJsonBody(
                **kwargs,
                tags=_get_tags(openpipe_options),
            ),
        )
    except Exception as e:
        # We don't want to break client apps if our API is down for some reason
        print(f"Error reporting to OpenPipe: {e}")
        print(e)


async def report_async(
    openpipe_options={},
    **kwargs,
):
    try:
        await external_api_report.asyncio_detailed(
            client=configured_client,
            json_body=external_api_report.ExternalApiReportJsonBody(
                **kwargs,
                tags=_get_tags(openpipe_options),
            ),
        )
    except Exception as e:
        # We don't want to break client apps if our API is down for some reason
        print(f"Error reporting to OpenPipe: {e}")
        print(e)
