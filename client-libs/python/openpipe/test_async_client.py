from functools import reduce
import pytest
import os
from dotenv import load_dotenv
import asyncio
from openai import AsyncOpenAI as BaseAsyncOpenAI

from . import AsyncOpenAI
from .merge_openai_chunks import merge_openai_chunks
from .test_sync_client import function_call, function

load_dotenv()

base_client = BaseAsyncOpenAI(
    base_url="http://localhost:3000/api/v1", api_key=os.environ["OPENPIPE_API_KEY"]
)
client = AsyncOpenAI()


@pytest.fixture(autouse=True)
def setup():
    print("\nresetting async client\n")
    global client
    client = AsyncOpenAI()


async def test_async_content():
    completion = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 3"}],
        openpipe={"tags": {"promptId": "test_async_content"}},
    )

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert last_logged.req_payload["messages"][0]["content"] == "count to 3"
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )


async def test_async_content_mistral():
    completion = await client.chat.completions.create(
        model="openpipe:test-content-mistral-p3",
        messages=[{"role": "system", "content": "count to 3"}],
        openpipe={"tags": {"promptId": "test_async_content_mistral"}},
    )

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert last_logged.req_payload["messages"][0]["content"] == "count to 3"
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )


async def test_async_function_call():
    completion = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        function_call=function_call,
        functions=[function],
        openpipe={"tags": {"promptId": "test_async_function_call"}},
    )

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.req_payload["messages"][0]["content"] == "tell me the weather in SF"
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["function_call"]["name"]
        == "get_current_weather"
    )


async def test_async_function_call_mistral():
    completion = await client.chat.completions.create(
        model="openpipe:test-tool-calls-mistral-p3",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        function_call=function_call,
        functions=[function],
        openpipe={"tags": {"promptId": "test_async_function_call_mistral"}},
    )

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.req_payload["messages"][0]["content"] == "tell me the weather in SF"
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["function_call"]["name"]
        == "get_current_weather"
    )


async def test_async_tool_calls():
    completion = await client.chat.completions.create(
        model="gpt-3.5-turbo-1106",
        messages=[
            {"role": "system", "content": "tell me the weather in SF and Orlando"}
        ],
        tools=[
            {
                "type": "function",
                "function": function,
            },
        ],
        openpipe={"tags": {"promptId": "test_async_tool_calls"}},
    )

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.req_payload["messages"][0]["content"]
        == "tell me the weather in SF and Orlando"
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["tool_calls"][0]["function"][
            "name"
        ]
        == "get_current_weather"
    )


async def test_async_tool_calls_mistral():
    completion = await client.chat.completions.create(
        model="openpipe:test-tool-calls-mistral-p3",
        messages=[
            {"role": "system", "content": "tell me the weather in SF and Orlando"}
        ],
        tools=[
            {
                "type": "function",
                "function": function,
            },
        ],
        openpipe={"tags": {"promptId": "test_async_tool_calls_mistral"}},
    )

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.req_payload["messages"][0]["content"]
        == "tell me the weather in SF and Orlando"
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["tool_calls"][0]["function"][
            "name"
        ]
        == "get_current_weather"
    )


async def test_async_streaming_content():
    completion = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 4"}],
        stream=True,
        openpipe={"tags": {"promptId": "test_async_streaming_content"}},
    )

    merged = None
    async for chunk in completion:
        merged = merge_openai_chunks(merged, chunk)

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == merged.choices[0].message.content
    )


async def test_async_streaming_content_ft_35():
    completion = await client.chat.completions.create(
        model="openpipe:test-content-35",
        messages=[{"role": "system", "content": "count to 4"}],
        stream=True,
        openpipe={"tags": {"promptId": "test_async_streaming_content_ft_35"}},
    )

    merged = None
    async for chunk in completion:
        merged = merge_openai_chunks(merged, chunk)

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == merged.choices[0].message.content
    )


async def test_async_streaming_content_ft_35_base_sdk():
    completion = await base_client.chat.completions.create(
        model="openpipe:test-content-35",
        messages=[{"role": "system", "content": "count to 5"}],
        stream=True,
        extra_headers={
            "op-log-request": "true",
            "op-tags": '{"promptId": "test_async_streaming_content_ft_35_base_sdk"}',
        },
    )

    merged = None
    async for chunk in completion:
        merged = merge_openai_chunks(merged, chunk)

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == merged.choices[0].message.content
    )


async def test_async_streaming_function_call():
    completion = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        function_call=function_call,
        functions=[function],
        stream=True,
        openpipe={"tags": {"promptId": "test_async_streaming_function_call"}},
    )

    merged = None
    async for chunk in completion:
        merged = merge_openai_chunks(merged, chunk)

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )

    assert (
        last_logged.req_payload["messages"][0]["content"] == "tell me the weather in SF"
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == merged.choices[0].message.content
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["function_call"]["name"]
        == merged.choices[0].message.function_call.name
    )


async def test_async_streaming_tool_calls():
    completion = await client.chat.completions.create(
        model="gpt-3.5-turbo-1106",
        messages=[
            {"role": "system", "content": "tell me the weather in SF and Orlando"}
        ],
        tools=[
            {
                "type": "function",
                "function": function,
            },
        ],
        stream=True,
        openpipe={"tags": {"promptId": "test_async_streaming_tool_calls"}},
    )

    merged = None
    async for chunk in completion:
        merged = merge_openai_chunks(merged, chunk)

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["tool_calls"][0]["function"][
            "arguments"
        ]
        == merged.choices[0].message.tool_calls[0].function.arguments
    )


async def test_async_with_tags():
    completion = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 10"}],
        openpipe={"tags": {"promptId": "test_async_with_tags"}},
    )

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    print(last_logged.tags)
    assert last_logged.tags["promptId"] == "test_async_with_tags"
    assert last_logged.tags["$sdk"] == "python"


async def test_async_default_base_url():
    default_client = AsyncOpenAI(api_key=os.environ["OPENPIPE_API_KEY"])

    completion = await default_client.chat.completions.create(
        model="openpipe:test-content-35",
        messages=[{"role": "system", "content": "count to 10"}],
        openpipe={"tags": {"promptId": "test_async_default_base_url"}},
    )

    assert completion.choices[0].message.content != None


async def test_async_bad_openai_call():
    try:
        await client.chat.completions.create(
            model="gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
            openpipe={"tags": {"promptId": "test_async_bad_openai_call"}},
        )
        assert False
    except Exception as e:
        print(e)
        pass

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.error_message == "The model `gpt-3.5-turbo-blaster` does not exist"
    )
    assert last_logged.status_code == 404


async def test_async_bad_openpipe_call():
    try:
        await client.chat.completions.create(
            model="openpipe:gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
            openpipe={"tags": {"promptId": "test_async_bad_openpipe_call"}},
        )
        assert False
    except Exception as e:
        print(e)
        pass

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.error_message
        == "The model `openpipe:gpt-3.5-turbo-blaster` does not exist"
    )
    assert last_logged.status_code == 404


async def test_async_bad_openai_call_base_sdk():
    try:
        await base_client.chat.completions.create(
            model="gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
            extra_headers={
                "op-log-request": "true",
                "op-tags": '{"promptId": "test_async_bad_openai_call_base_sdk"}',
            },
        )
        assert False
    except Exception as e:
        print(e)
        pass

    await asyncio.sleep(0.1)
    last_logged = (
        await client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.error_message
        == "404 The model `gpt-3.5-turbo-blaster` does not exist"
    )
    assert last_logged.status_code == 404
