from dotenv import load_dotenv
from . import openai, configure_openpipe
import os
import pytest

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

configure_openpipe(
    base_url="http://localhost:3000/api", api_key=os.getenv("OPENPIPE_API_KEY")
)


@pytest.mark.skip
def test_sync():
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 10"}],
    )

    print(completion.choices[0].message.content)


@pytest.mark.skip
def test_streaming():
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 10"}],
        stream=True,
    )

    for chunk in completion:
        print(chunk)


@pytest.mark.skip
async def test_async():
    acompletion = await openai.ChatCompletion.acreate(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "count down from 5"}],
    )

    print(acompletion.choices[0].message.content)


@pytest.mark.skip
async def test_async_streaming():
    acompletion = await openai.ChatCompletion.acreate(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "count down from 5"}],
        stream=True,
    )

    async for chunk in acompletion:
        print(chunk)


def test_sync_with_tags():
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "count to 10"}],
        openpipe={"tags": {"promptId": "testprompt"}},
    )
    print("finished")

    print(completion.choices[0].message.content)


@pytest.mark.focus
def test_bad_call():
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-blaster",
        messages=[{"role": "system", "content": "count to 10"}],
        stream=True,
    )
