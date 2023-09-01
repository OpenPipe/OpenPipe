from openpipe.api_client.api.default import (
    report as api_report,
    check_cache,
)
from openpipe.api_client.client import AuthenticatedClient
from openpipe.api_client.models.report_json_body_tags import (
    ReportJsonBodyTags,
)
import time
import os
import pkg_resources

configured_client = AuthenticatedClient(
    base_url="https://app.openpipe.ai/api/v1", token=""
)

if os.environ.get("OPENPIPE_API_KEY"):
    configured_client.token = os.environ["OPENPIPE_API_KEY"]


def _get_tags(openpipe_options):
    tags = openpipe_options.get("tags") or {}
    tags["$sdk"] = "python"
    tags["$sdk.version"] = pkg_resources.get_distribution('openpipe').version

    return ReportJsonBodyTags.from_dict(tags)


def _should_check_cache(openpipe_options, req_payload):
    if configured_client.token == "":
        return False

    cache_requested = openpipe_options.get("cache", False)
    streaming = req_payload.get("stream", False)
    if cache_requested and streaming:
        print(
            "Caching is not yet supported for streaming requests. Ignoring cache flag. Vote for this feature at https://github.com/OpenPipe/OpenPipe/issues/159"
        )
        return False
    return cache_requested


def _process_cache_payload(
    payload: check_cache.CheckCacheResponse200,
):
    if not payload or not payload.resp_payload:
        return None
    payload.resp_payload["openpipe"] = {"cache_status": "HIT"}

    return payload.resp_payload


def maybe_check_cache(
    openpipe_options={},
    req_payload={},
):
    if not _should_check_cache(openpipe_options, req_payload):
        return None
    try:
        payload = check_cache.sync(
            client=configured_client,
            json_body=check_cache.CheckCacheJsonBody(
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
    if not _should_check_cache(openpipe_options, req_payload):
        return None

    try:
        payload = await check_cache.asyncio(
            client=configured_client,
            json_body=check_cache.CheckCacheJsonBody(
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
