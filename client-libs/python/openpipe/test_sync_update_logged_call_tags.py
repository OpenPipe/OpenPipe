from functools import reduce
import pytest
from dotenv import load_dotenv
import time
import random

from .client import OpenPipe
from .test_config import TEST_LAST_LOGGED, OPENPIPE_BASE_URL, OPENPIPE_API_KEY

load_dotenv()

op_client = OpenPipe(api_key=OPENPIPE_API_KEY, base_url=OPENPIPE_BASE_URL)

resp_payload = {
    "model": "gpt-3.5-turbo-0613",
    "usage": {
        "total_tokens": 39,
        "prompt_tokens": 11,
        "completion_tokens": 28,
    },
    "object": "chat.completion",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "1, 2, 3, 4, 5, 6, 7, 8, 9, 10",
            },
            "finish_reason": "stop",
        },
    ],
    "created": 1704449593,
}


def generate_random_id():
    return "".join([random.choice("abcdefghijklmnopqrstuvwxyz") for i in range(10)])


def last_logged_call():
    return op_client.base_client.local_testing_only_get_latest_logged_call()


def test_sync_adds_tags():
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    original_prompt_id = "original prompt id" + generate_random_id()

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={"promptId": original_prompt_id},
    )

    new_tags = {
        "any_key": "any value",
        "otherId": "value 3",
    }

    resp = op_client.update_log_tags(
        filters=[{"field": "tags.promptId", "equals": original_prompt_id}],
        tags=new_tags,
    )

    assert resp.matched_logs == 1

    if not TEST_LAST_LOGGED:
        return

    time.sleep(0.1)
    last_logged = last_logged_call()
    assert last_logged.tags["promptId"] == original_prompt_id
    assert last_logged.tags["any_key"] == "any value"
    assert last_logged.tags["otherId"] == "value 3"


def test_sync_updates_tags():
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    original_prompt_id = "original prompt id " + generate_random_id()

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 1",
            "any_key": "any value",
        },
    )

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 2",
            "any_key": "any value",
        },
    )

    updated_tags = {
        "promptId": "updated prompt id " + generate_random_id(),
        "otherId": "value 3",
    }

    resp = op_client.update_log_tags(
        filters=[{"field": "tags.promptId", "equals": original_prompt_id}],
        tags=updated_tags,
    )

    assert resp.matched_logs == 2

    if not TEST_LAST_LOGGED:
        return

    time.sleep(0.1)
    last_logged = last_logged_call()
    assert last_logged.tags["promptId"] == updated_tags["promptId"]
    assert last_logged.tags["otherId"] == updated_tags["otherId"]
    assert last_logged.tags["any_key"] == "any value"


def test_sync_updates_tag_by_completion_id():
    completion_id = generate_random_id()
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    original_prompt_id = "original prompt id " + generate_random_id()

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload={
            "id": "other completion id",
            **resp_payload,
        },
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 1",
            "any_key": "any value",
        },
    )

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload={
            "id": completion_id,
            **resp_payload,
        },
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 2",
            "any_key": "any value",
        },
    )

    updated_tags = {
        "promptId": "updated prompt id " + generate_random_id(),
        "otherId": "value 3",
    }

    resp = op_client.update_log_tags(
        filters=[{"field": "completionId", "equals": completion_id}],
        tags=updated_tags,
    )

    assert resp.matched_logs == 1

    if not TEST_LAST_LOGGED:
        return

    time.sleep(0.1)
    last_logged = last_logged_call()
    assert last_logged.tags["promptId"] == updated_tags["promptId"]
    assert last_logged.tags["otherId"] == updated_tags["otherId"]
    assert last_logged.tags["any_key"] == "any value"


def test_sync_updates_tag_by_model():
    model = generate_random_id()
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    original_prompt_id = "original prompt id " + generate_random_id()

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 1",
            "any_key": "any value",
        },
    )

    updated_tags = {
        "promptId": "updated prompt id " + generate_random_id(),
        "otherId": "value 3",
    }

    resp = op_client.update_log_tags(
        filters=[{"field": "model", "equals": model}],
        tags=updated_tags,
    )

    assert resp.matched_logs == 1

    if not TEST_LAST_LOGGED:
        return

    time.sleep(0.1)
    last_logged = last_logged_call()
    assert last_logged.tags["promptId"] == updated_tags["promptId"]
    assert last_logged.tags["otherId"] == updated_tags["otherId"]
    assert last_logged.tags["any_key"] == "any value"


def test_sync_updates_by_combination_of_filters():
    model = generate_random_id()
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    original_prompt_id = "original prompt id " + generate_random_id()

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 1",
            "any_key": "any value",
        },
    )

    updated_tags = {
        "promptId": "updated prompt id " + generate_random_id(),
        "otherId": "value 3",
    }

    resp = op_client.update_log_tags(
        filters=[
            {"field": "model", "equals": model},
            {"field": "tags.promptId", "equals": original_prompt_id},
        ],
        tags=updated_tags,
    )

    assert resp.matched_logs == 1

    if not TEST_LAST_LOGGED:
        return

    time.sleep(0.1)
    last_logged = last_logged_call()
    assert last_logged.tags["promptId"] == updated_tags["promptId"]
    assert last_logged.tags["otherId"] == updated_tags["otherId"]
    assert last_logged.tags["any_key"] == "any value"


def test_sync_updates_some_tags_by_combination_of_filters():
    model = generate_random_id()
    other_model = "model-to-not-update"
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    original_prompt_id = "original prompt id " + generate_random_id()

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 1",
            "any_key": "any value",
        },
    )

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 1",
            "any_key": "any value",
        },
    )

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload={
            **payload,
            "model": other_model,
        },
        resp_payload=None,
        tags={
            "promptId": original_prompt_id,
            "otherId": "value 1",
            "any_key": "any value",
        },
    )

    updated_tags = {
        "promptId": "updated prompt id " + generate_random_id(),
        "otherId": "value 3",
    }

    resp = op_client.update_log_tags(
        filters=[
            {"field": "model", "equals": model},
            {"field": "tags.promptId", "equals": original_prompt_id},
        ],
        tags=updated_tags,
    )

    assert resp.matched_logs == 2

    if not TEST_LAST_LOGGED:
        return

    time.sleep(0.1)
    last_logged = last_logged_call()
    assert last_logged.tags["promptId"] == original_prompt_id
    assert last_logged.tags["otherId"] == "value 1"
    assert last_logged.tags["any_key"] == "any value"


def test_sync_deletes_tags():
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    keep_prompt_id = "prompt id for tag to keep " + generate_random_id()
    delete_prompt_id = "prompt id for tag to delete " + generate_random_id()

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": keep_prompt_id,
            "otherId": "value 1",
            "any_key": "any value",
        },
    )

    keep_resp = op_client.update_log_tags(
        filters=[{"field": "tags.promptId", "equals": delete_prompt_id}],
        tags={"promptId": None},
    )

    assert keep_resp.matched_logs == 0

    if not TEST_LAST_LOGGED:
        return

    keep_logged_call = last_logged_call()
    assert keep_logged_call.tags["promptId"] == keep_prompt_id

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": delete_prompt_id,
            "otherId": "value 2",
            "any_key": "any value",
        },
    )

    resp = op_client.update_log_tags(
        filters=[{"field": "tags.promptId", "equals": delete_prompt_id}],
        tags={"promptId": None},
    )

    assert resp.matched_logs == 1

    if not TEST_LAST_LOGGED:
        return

    last_logged = last_logged_call()
    assert last_logged.tags.get("promptId") == None


def test_sync_deletes_nothing_when_no_tags_matched():
    original_prompt_id = "id 1"
    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=None,
        resp_payload=None,
        tags={
            "promptId": original_prompt_id,
        },
    )
    resp = op_client.update_log_tags(
        filters=[{"field": "tags.promptId", "equals": generate_random_id()}],
        tags={"promptId": None},
    )

    assert resp.matched_logs == 0

    if not TEST_LAST_LOGGED:
        return

    last_logged = last_logged_call()
    assert last_logged.tags["promptId"] == original_prompt_id


def test_sync_deletes_from_all_logged_calls_when_no_filters_provided():
    prompt_id = generate_random_id()
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "count to 3"}],
    }

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": prompt_id,
        },
    )

    if not TEST_LAST_LOGGED:
        return

    op_client.report(
        requested_at=int(time.time() * 1000),
        received_at=int(time.time() * 1000),
        req_payload=payload,
        resp_payload=None,
        tags={
            "promptId": prompt_id,
        },
    )

    resp = op_client.update_log_tags(
        filters=[],
        tags={"promptId": None},
    )

    assert resp.matched_logs >= 2

    last_logged = last_logged_call()
    assert last_logged.tags.get("promptId") == None
