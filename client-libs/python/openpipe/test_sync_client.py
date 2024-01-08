from functools import reduce
import pytest
import time
from dotenv import load_dotenv
import os
from openai import OpenAI as BaseOpenAI

from . import OpenAI
from .merge_openai_chunks import merge_openai_chunks

load_dotenv()

base_client = BaseOpenAI(
    base_url="http://localhost:3000/api/v1", api_key=os.environ["OPENPIPE_API_KEY"]
)
client = OpenAI()

function_call = {"name": "get_current_weather"}
function = {
    "name": "get_current_weather",
    "description": "Get the current weather in a given location",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "The city and state, e.g. San Francisco, CA",
            },
            "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
            },
        },
        "required": ["location"],
    },
}


def test_sync_content():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 3"}],
        openpipe={"tags": {"promptId": "test_sync_content"}},
    )

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert last_logged.req_payload["messages"][0]["content"] == "count to 3"
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )


def test_sync_content_mistral():
    completion = client.chat.completions.create(
        model="openpipe:test-content-mistral-p3",
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": "count to 3"}],
        openpipe={"tags": {"promptId": "test_sync_content_mistral"}},
    )

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert last_logged.req_payload["messages"][0]["content"] == "count to 3"
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )


def test_sync_function_call():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        function_call=function_call,
        functions=[function],
        openpipe={"tags": {"promptId": "test_sync_function_call"}},
    )
    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
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


def test_sync_function_call_mistral():
    completion = client.chat.completions.create(
        model="openpipe:test-tool-calls-mistral-p3",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        function_call=function_call,
        functions=[function],
        openpipe={"tags": {"promptId": "test_sync_function_call_mistral"}},
    )
    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
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


def test_sync_tool_calls():
    completion = client.chat.completions.create(
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
        openpipe={"tags": {"promptId": "test_sync_tool_calls"}},
    )
    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
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


def test_sync_tool_calls_mistral():
    completion = client.chat.completions.create(
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
        openpipe={"tags": {"promptId": "test_sync_tool_calls_mistral"}},
    )
    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
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


def test_sync_streaming_content():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 4"}],
        stream=True,
        openpipe={"tags": {"promptId": "test_sync_streaming_content"}},
    )

    merged = reduce(merge_openai_chunks, completion, None)

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == merged.choices[0].message.content
    )


@pytest.mark.focus
def test_sync_streaming_content_ft_35():
    completion = client.chat.completions.create(
        model="openpipe:test-content-35",
        messages=[{"role": "system", "content": "count to 4"}],
        stream=True,
        extra_headers={
            "op-log-request": "true",
            "op-tags": '{"promptId": "test_sync_streaming_content_ft_35"}',
        },
    )

    merged = None
    for chunk in completion:
        merged = merge_openai_chunks(merged, chunk)

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == merged.choices[0].message.content
    )


def test_sync_streaming_content_ft_35_base_sdk():
    completion = base_client.chat.completions.create(
        model="openpipe:test-content-35",
        messages=[{"role": "system", "content": "count to 5"}],
        stream=True,
        extra_headers={
            "op-log-request": "true",
            "op-tags": '{"promptId": "test_sync_streaming_content_ft_35_base_sdk"}',
        },
    )

    merged = None
    for chunk in completion:
        merged = merge_openai_chunks(merged, chunk)

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == merged.choices[0].message.content
    )


def test_sync_streaming_function_call():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        function_call=function_call,
        functions=[function],
        stream=True,
        openpipe={"tags": {"promptId": "test_sync_streaming_function_call"}},
    )

    merged = reduce(merge_openai_chunks, completion, None)

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
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


def test_sync_streaming_tool_calls():
    completion = client.chat.completions.create(
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
        openpipe={"tags": {"promptId": "test_sync_streaming_tool_calls"}},
    )

    merged = reduce(merge_openai_chunks, completion, None)

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["tool_calls"][0]["function"][
            "arguments"
        ]
        == merged.choices[0].message.tool_calls[0].function.arguments
    )


def test_sync_with_tags():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 10"}],
        openpipe={"tags": {"promptId": "test_sync_with_tags"}},
    )

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    print(last_logged.tags)
    assert last_logged.tags["promptId"] == "test_sync_with_tags"
    assert last_logged.tags["$sdk"] == "python"


def test_bad_openai_call():
    try:
        client.chat.completions.create(
            model="gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
        )
        assert False
    except Exception:
        pass
    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.error_message == "The model `gpt-3.5-turbo-blaster` does not exist"
    )
    assert last_logged.status_code == 404


def test_bad_openpipe_call():
    try:
        client.chat.completions.create(
            model="openpipe:gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
        )
        assert False
    except Exception:
        pass
    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert (
        last_logged.error_message
        == "The model `openpipe:gpt-3.5-turbo-blaster` does not exist"
    )
    assert last_logged.status_code == 404


def test_bad_openai_initialization():
    bad_client = OpenAI(api_key="bad_key")
    try:
        bad_client.chat.completions.create(
            model="gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
        )
        assert False
    except Exception:
        pass


def test_bad_openpipe_initialization():
    bad_client = OpenAI(openpipe={"api_key": "bad_key"})

    system_content = f"Write this number: {time.time()}"

    bad_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": system_content}],
        openpipe={"tags": {"promptId": "test_bad_openpipe_initialization"}},
    )

    last_logged = (
        client.openpipe_reporting_client.local_testing_only_get_latest_logged_call()
    )
    assert last_logged.req_payload["messages"][0]["content"] != system_content
