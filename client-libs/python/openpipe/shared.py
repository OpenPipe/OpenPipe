from openpipe.api_client.api.default import (
    external_api_report,
    external_api_check_cache,
)
from openpipe.api_client.client import AuthenticatedClient
from openpipe.api_client.models.external_api_report_json_body_tags import (
    ExternalApiReportJsonBodyTags,
)
import toml
import time

version = toml.load("pyproject.toml")["tool"]["poetry"]["version"]

configured_client = AuthenticatedClient(
    base_url="https://app.openpipe.ai/api/v1", token=""
)


def _get_tags(openpipe_options):
    tags = openpipe_options.get("tags") or {}
    tags["$sdk"] = "python"
    tags["$sdk_version"] = version

    return ExternalApiReportJsonBodyTags.from_dict(tags)


def _should_check_cache(openpipe_options):
    if configured_client.token == "":
        return False
    return openpipe_options.get("cache", False)


def _process_cache_payload(
    payload: external_api_check_cache.ExternalApiCheckCacheResponse200,
):
    if not payload or not payload.resp_payload:
        return None
    payload.resp_payload["openpipe"] = {"cache_status": "HIT"}

    return payload.resp_payload


def maybe_check_cache(
    openpipe_options={},
    req_payload={},
):
    if not _should_check_cache(openpipe_options):
        return None
    try:
        payload = external_api_check_cache.sync(
            client=configured_client,
            json_body=external_api_check_cache.ExternalApiCheckCacheJsonBody(
                req_payload=req_payload,
                requested_at=int(time.time() * 1000),
                tags=_get_tags(openpipe_options),
            ),
        )
        return _process_cache_payload(payload)

    except Exception as e:
        # We don't want to break client apps if our API is down for some reason
        print(f"Error reporting to OpenPipe: {e}")
        print(e)
        return None


async def maybe_check_cache_async(
    openpipe_options={},
    req_payload={},
):
    if not _should_check_cache(openpipe_options):
        return None

    try:
        payload = await external_api_check_cache.asyncio(
            client=configured_client,
            json_body=external_api_check_cache.ExternalApiCheckCacheJsonBody(
                req_payload=req_payload,
                requested_at=int(time.time() * 1000),
                tags=_get_tags(openpipe_options),
            ),
        )
        return _process_cache_payload(payload)

    except Exception as e:
        # We don't want to break client apps if our API is down for some reason
        print(f"Error reporting to OpenPipe: {e}")
        print(e)
        return None


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
