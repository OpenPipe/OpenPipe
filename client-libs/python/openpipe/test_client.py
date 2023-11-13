from functools import reduce
import pytest

from . import OpenAI
from .api_client.api.default import local_testing_only_get_latest_logged_call
from .shared import configured_client
from .merge_openai_chunks import merge_openai_chunks

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


def last_logged_call():
    return local_testing_only_get_latest_logged_call.sync(client=configured_client)


def test_sync_content():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 3"}],
        openpipe={"tags": {"promptId": "test_sync_content"}},
    )

    print("completion is", completion)
    last_logged = last_logged_call()
    assert (
        last_logged.model_response.req_payload["messages"][0]["content"] == "count to 3"
    )
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )


@pytest.mark.focus
def test_sync_function_call():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        function_call=function_call,
        functions=[function],
        openpipe={"tags": {"promptId": "test_sync_function_call"}},
    )
    last_logged = last_logged_call()
    assert (
        last_logged.model_response.req_payload["messages"][0]["content"]
        == "tell me the weather in SF"
    )
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"][
            "function_call"
        ]["name"]
        == "get_current_weather"
    )


def test_sync_tool_calls():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        tool_choice={"type": "function", "function": function_call},
        tools=[
            {
                "type": "function",
                "function": function,
            },
        ],
        openpipe={"tags": {"promptId": "test_sync_tool_calls"}},
    )
    last_logged = last_logged_call()
    assert (
        last_logged.model_response.req_payload["messages"][0]["content"]
        == "tell me the weather in SF"
    )
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["tool_calls"][
            0
        ]["function"]["name"]
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

    last_logged = last_logged_call()
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == merged.choices[0].message.content
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

    last_logged = last_logged_call()
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["tool_calls"][
            0
        ]["function"]["arguments"]
        == merged.choices[0].message.tool_calls[0].function.arguments
    )
