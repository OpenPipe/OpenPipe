from dotenv import load_dotenv
import pytest
import os
from api_client.api.default import get_training_info
from api_client.client import AuthenticatedClient

load_dotenv()

configured_client = AuthenticatedClient(
    base_url="https://app.openpipe.ai/api/v1", token=""
)

if os.environ.get("AUTHENTICATED_SYSTEM_KEY"):
    configured_client.token = os.environ["AUTHENTICATED_SYSTEM_KEY"]

if os.environ.get("OPENPIPE_BASE_URL"):
    configured_client._base_url = os.environ["OPENPIPE_BASE_URL"]


def test_get_training_info():
    training_info = get_training_info.sync(
        client=configured_client,
        fine_tune_id=os.environ["FINE_TUNE_ID"],
    )
    print("training_info is", training_info)
