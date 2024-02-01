from functools import reduce
import pytest
from dotenv import load_dotenv
import asyncio
import time

from . import AsyncOpenAI
from .client import AsyncOpenPipe
from .test_config import TEST_LAST_LOGGED, OPENPIPE_BASE_URL, OPENPIPE_API_KEY

load_dotenv()

client = AsyncOpenAI()
op_client = AsyncOpenPipe(api_key=OPENPIPE_API_KEY, base_url=OPENPIPE_BASE_URL)


async def last_logged_call():
    return await op_client.base_client.local_testing_only_get_latest_logged_call()


@pytest.fixture(autouse=True)
def setup():
    print("\nresetting async client\n")
    global client
    client = AsyncOpenAI()
    global op_client
    op_client = AsyncOpenPipe(api_key=OPENPIPE_API_KEY, base_url=OPENPIPE_BASE_URL)


async def test_async_reports_valid_response_payload():
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    tags = {"promptId": "test_async_reports_valid_response_payload"}

    completion = await client.chat.completions.create(**payload)

    await op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=completion,
        tags=tags,
        status_code=200,
    )

    if not TEST_LAST_LOGGED:
        return

    await asyncio.sleep(0.1)
    last_logged = await last_logged_call()
    assert last_logged.req_payload["messages"][0]["content"] == "count to 3"
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert last_logged.tags["promptId"] == "test_async_reports_valid_response_payload"


async def test_async_reports_null_response_payload():
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    tags = {"promptId": "test_async_reports_null_response_payload"}

    await op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags=tags,
        status_code=200,
    )

    if not TEST_LAST_LOGGED:
        return

    await asyncio.sleep(0.1)
    last_logged = await last_logged_call()
    assert last_logged.req_payload["messages"][0]["content"] == "count to 3"
    assert last_logged.resp_payload == None
    assert last_logged.tags["promptId"] == "test_async_reports_null_response_payload"


async def test_async_reports_invalid_request_payload():
    payload = {"x": "invalid"}

    tags = {"promptId": "test_async_reports_invalid_request_payload"}

    await op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags=tags,
        status_code=400,
    )

    if not TEST_LAST_LOGGED:
        return

    await asyncio.sleep(0.1)
    last_logged = await last_logged_call()
    assert last_logged.req_payload == payload
    assert last_logged.resp_payload == None
    assert last_logged.tags["promptId"] == "test_async_reports_invalid_request_payload"


async def test_async_reports_unusual_tags():
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    tags = {
        "promptId": "test_async_reports_unusual_tags",
        "numberTag": 1,
        "booleanTag": True,
        "nullTag": None,
    }

    await op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags=tags,
        status_code=200,
    )

    if not TEST_LAST_LOGGED:
        return

    await asyncio.sleep(0.1)
    last_logged = await last_logged_call()
    assert last_logged.req_payload["messages"][0]["content"] == "count to 3"
    assert last_logged.resp_payload == None
    assert last_logged.tags["promptId"] == "test_async_reports_unusual_tags"
    assert last_logged.tags["numberTag"] == "1"
    assert last_logged.tags["booleanTag"] == "true"
    assert last_logged.tags.get("nullTag") == None
