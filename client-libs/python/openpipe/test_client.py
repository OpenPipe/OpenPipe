from . import OpenAI
import json

from .api_client.api.default import local_testing_only_get_latest_logged_call
from .shared import configured_client

client = OpenAI()


def last_logged_call():
    return local_testing_only_get_latest_logged_call.sync(client=configured_client)


def test_sync():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 3"}],
        openpipe={"tags": {"promptId": "test_sync"}},
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


def test_tool_calls():
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "tell me the weather in SF"}],
        tool_choice={"type": "function", "function": {"name": "get_current_weather"}},
        tools=[
            {
                "type": "function",
                "function": {
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
                },
            },
        ],
        openpipe={"tags": {"promptId": "test_tool_calls"}},
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
