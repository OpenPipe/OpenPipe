from functools import reduce
from dotenv import load_dotenv
import os
import pytest
from . import openai, configure_openpipe, configured_client
from .api_client.api.default import local_testing_only_get_latest_logged_call
from .merge_openai_chunks import merge_openai_chunks
import random
import string


def random_string(length):
    letters = string.ascii_lowercase
    return "".join(random.choice(letters) for i in range(length))


load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

configure_openpipe(
    base_url="http://localhost:3000/api/v1", api_key=os.getenv("OPENPIPE_API_KEY")
)


def last_logged_call():
    return local_testing_only_get_latest_logged_call.sync(client=configured_client)


@pytest.mark.focus
def test_sync():
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 3"}],
    )

    print("completion is", completion)
    last_logged = last_logged_call()
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert (
        last_logged.model_response.req_payload["messages"][0]["content"] == "count to 3"
    )

    assert completion.openpipe["cache_status"] == "SKIP"


def test_streaming():
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 4"}],
        stream=True,
    )

    merged = reduce(merge_openai_chunks, completion, None)
    last_logged = last_logged_call()
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == merged["choices"][0]["message"]["content"]
    )


async def test_async():
    completion = await openai.ChatCompletion.acreate(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "count down from 5"}],
    )
    last_logged = last_logged_call()
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    assert (
        last_logged.model_response.req_payload["messages"][0]["content"]
        == "count down from 5"
    )

    assert completion.openpipe["cache_status"] == "SKIP"


async def test_async_streaming():
    completion = await openai.ChatCompletion.acreate(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "count down from 5"}],
        stream=True,
    )

    merged = None
    async for chunk in completion:
        assert chunk.openpipe["cache_status"] == "SKIP"
        merged = merge_openai_chunks(merged, chunk)

    last_logged = last_logged_call()

    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == merged["choices"][0]["message"]["content"]
    )
    assert (
        last_logged.model_response.req_payload["messages"][0]["content"]
        == "count down from 5"
    )
    assert merged["openpipe"]["cache_status"] == "SKIP"


def test_sync_with_tags():
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 10"}],
        openpipe={"tags": {"promptId": "testprompt"}},
    )

    last_logged = last_logged_call()
    assert (
        last_logged.model_response.resp_payload["choices"][0]["message"]["content"]
        == completion.choices[0].message.content
    )
    print(last_logged.tags)
    assert last_logged.tags["promptId"] == "testprompt"
    assert last_logged.tags["$sdk"] == "python"


def test_bad_call():
    try:
        completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo-blaster",
            messages=[{"role": "system", "content": "count to 10"}],
            stream=True,
        )
        assert False
    except Exception as e:
        pass
    last_logged = last_logged_call()
    print(last_logged)
    assert (
        last_logged.model_response.error_message
        == "The model `gpt-3.5-turbo-blaster` does not exist"
    )
    assert last_logged.model_response.status_code == 404


async def test_caching():
    messages = [{"role": "system", "content": f"repeat '{random_string(10)}'"}]
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        openpipe={"cache": True},
    )
    assert completion.openpipe["cache_status"] == "MISS"

    first_logged = last_logged_call()
    assert (
        completion.choices[0].message.content
        == first_logged.model_response.resp_payload["choices"][0]["message"]["content"]
    )

    completion2 = await openai.ChatCompletion.acreate(
        model="gpt-3.5-turbo",
        messages=messages,
        openpipe={"cache": True},
    )
    assert completion2.openpipe["cache_status"] == "HIT"
