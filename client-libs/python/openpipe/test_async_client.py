from functools import reduce
import pytest

from . import AsyncOpenAI
from .merge_openai_chunks import merge_openai_chunks
from .test_sync_client import function_call, function, last_logged_call

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

    last_logged = last_logged_call(client)
    assert last_logged.req_payload["messages"][0]["content"] == "count to 3"
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )


async def test_async_content_ft():
    completion = await client.chat.completions.create(
        model="openpipe:test-content-ft",
        messages=[{"role": "system", "content": "count to 3"}],
        openpipe={"tags": {"promptId": "test_async_content_ft"}},
    )

    last_logged = last_logged_call(client)
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
    last_logged = last_logged_call(client)
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


async def test_async_function_call_ft():
    completion = await client.chat.completions.create(
        model="openpipe:test-tool-calls-ft",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        function_call=function_call,
        functions=[function],
        openpipe={"tags": {"promptId": "test_async_function_call_ft"}},
    )
    last_logged = last_logged_call(client)
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
    last_logged = last_logged_call(client)
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


async def test_async_tool_calls_ft():
    completion = await client.chat.completions.create(
        model="openpipe:test-tool-calls-ft",
        messages=[
            {"role": "system", "content": "tell me the weather in SF and Orlando"}
        ],
        tools=[
            {
                "type": "function",
                "function": function,
            },
        ],
        openpipe={"tags": {"promptId": "test_async_tool_calls_ft"}},
    )
    last_logged = last_logged_call(client)
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

    last_logged = last_logged_call(client)
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

    last_logged = last_logged_call(client)

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

    last_logged = last_logged_call(client)
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

    last_logged = last_logged_call(client)
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    print(last_logged.tags)
    assert last_logged.tags["promptId"] == "test_async_with_tags"
    assert last_logged.tags["$sdk"] == "python"


async def test_bad_openai_call():
    try:
        await client.chat.completions.create(
            model="gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
        )
        assert False
    except Exception:
        pass
    last_logged = last_logged_call(client)
    assert (
        last_logged.error_message == "The model `gpt-3.5-turbo-blaster` does not exist"
    )
    assert last_logged.status_code == 404


async def test_bad_openpipe_call():
    try:
        await client.chat.completions.create(
            model="openpipe:gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
        )
        assert False
    except Exception:
        pass
    last_logged = last_logged_call(client)
    assert last_logged.error_message == "The model does not exist"
    assert last_logged.status_code == 404
