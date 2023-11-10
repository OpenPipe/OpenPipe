from openpipe.api_client.api.default import (
    report as api_report,
)
from openpipe.api_client.client import AuthenticatedClient
from openpipe.api_client.models.report_json_body_tags import (
    ReportJsonBodyTags,
)
import os
import pkg_resources

configured_client = AuthenticatedClient(
    base_url="https://app.openpipe.ai/api/v1", token="", raise_on_unexpected_status=True
)

if os.environ.get("OPENPIPE_API_KEY"):
    configured_client.token = os.environ["OPENPIPE_API_KEY"]

if os.environ.get("OPENPIPE_BASE_URL"):
    configured_client._base_url = os.environ["OPENPIPE_BASE_URL"]


def _get_tags(openpipe_options):
    tags = openpipe_options.get("tags") or {}
    tags["$sdk"] = "python"
    tags["$sdk.version"] = pkg_resources.get_distribution("openpipe").version

    return ReportJsonBodyTags.from_dict(tags)


def _should_log_request(openpipe_options={}):
    if configured_client.token == "":
        return False

    return openpipe_options.get("log_request", True)


def report(
    openpipe_options={},
    **kwargs,
):
    if not _should_log_request(openpipe_options):
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
    openpipe_options={},
    **kwargs,
):
    if not _should_log_request(openpipe_options):
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
