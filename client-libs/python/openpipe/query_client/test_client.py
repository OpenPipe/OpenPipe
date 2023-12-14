import pytest
import json

from typing import Any, Dict
from httpx import Response

from .client import QueryClient
from .types import FilterCondition


def test_sync_query_logged_calls():
    mock_response_data = {
        "calls": [
            {
                "id": "2a916e77-24c6-4aba-8487-0b1feeb8448b",
                "requestedAt": "2023-12-14T07:09:58.233Z",
                "receivedAt": "2023-12-14T07:09:59.689Z",
                "reqPayload": {
                    "n": 1,
                    "model": "gpt-3.5-turbo",
                    "stream": False,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Classify user query into positive, negative or neutral.",
                        },
                        {"role": "user", "content": "this is good"},
                    ],
                    "temperature": 0.7,
                },
                "respPayload": {
                    "id": "chatcmpl-8Va91m6BxoONTlUakBaVJXVYYKKGN",
                    "model": "gpt-3.5-turbo-0613",
                    "usage": {
                        "total_tokens": 26,
                        "prompt_tokens": 25,
                        "completion_tokens": 1,
                    },
                    "object": "chat.completion",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "Positive"},
                            "finish_reason": "stop",
                        }
                    ],
                    "created": 1702537799,
                },
                "inputTokens": 25,
                "outputTokens": 1,
                "cost": 3.95e-05,
                "statusCode": 200,
                "durationMs": 1456,
                "model": "gpt-3.5-turbo",
                "tags": {
                    "chain_name": "classify",
                    "any_key": "some",
                    "$sdk": "python",
                    "$sdk.version": "4.0.3",
                },
            },
        ],
        "count": 2,
    }

    auth_client = AuthClientMock(mock_response_data)
    client = QueryClient(auth_client=auth_client)
    resp = client.query_logged_calls(
        filters=[
            FilterCondition(field="chain_name", comparator="=", value="classify"),
        ]
    )
    assert resp
    assert len(resp.calls) == 1


class ClientMock:
    def __init__(self, mock_response_data: Dict[Any, Any]) -> None:
        self.mock_response_data = mock_response_data

    def request(self, **kwargs) -> Response:
        return Response(status_code=200, content=json.dumps(self.mock_response_data))


class AuthClientMock:
    def __init__(self, mock_response_data: Dict[Any, Any]) -> None:
        self.mock_response_data = mock_response_data

    def get_httpx_client(self) -> ClientMock:
        return ClientMock(self.mock_response_data)
