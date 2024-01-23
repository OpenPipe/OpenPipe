import os
from .api_client.client import AuthenticatedClient


def client(base_url: str) -> AuthenticatedClient:
    return AuthenticatedClient(
        base_url=base_url, token=os.environ["AUTHENTICATED_SYSTEM_KEY"]
    )
