from typing import Any, List, Optional

from openpipe.api_client.client import AuthenticatedClient
from openpipe.shared import configure_openpipe_client
from .types import QueryResponse, FilterCondition


class QueryClient:
    def __init__(self, auth_client: AuthenticatedClient) -> None:
        self._auth_client = auth_client

    def query_logged_calls(
        self, page: int = 1, pageSize: int = 10, filters: List[FilterCondition] = []
    ) -> QueryResponse:
        kwargs = {
            "method": "post",
            "url": "/query/logged-calls",
            "json": {
                "page": page,
                "pageSize": pageSize,
                "filters": list(map(lambda c: c.dict(), filters)),
            },
        }

        response = self._auth_client.get_httpx_client().request(
            **kwargs,
        )
        assert response.status_code == 200, response.text
        return QueryResponse.parse_obj(response.json())

    @staticmethod
    def create(
        api_key: Optional[str] = None, base_url: Optional[str] = None
    ) -> "QueryClient":
        openpipe_options = {}
        if api_key:
            openpipe_options["api_key"] = api_key
        if base_url:
            openpipe_options["base_url"] = base_url
        auth_client = configure_openpipe_client(openpipe_options)
        return QueryClient(auth_client=auth_client)
