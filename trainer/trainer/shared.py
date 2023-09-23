from trainer.api_client.client import AuthenticatedClient
import os

configured_client = AuthenticatedClient(
    base_url="https://app.openpipe.ai/api/v1", token=""
)

if os.environ.get("AUTHENTICATED_SYSTEM_KEY"):
    configured_client.token = os.environ["AUTHENTICATED_SYSTEM_KEY"]

if os.environ.get("OPENPIPE_BASE_URL"):
    configured_client._base_url = os.environ["OPENPIPE_BASE_URL"]
