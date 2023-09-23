from dotenv import load_dotenv
import pytest
import os
from docker_client.shared import configured_client
from docker_client.api_client.api.default import get_training_info

load_dotenv()

@pytest.mark.focus
def test_get_training_info():
    training_info = get_training_info.sync(
        client=configured_client,
        fine_tune_id=os.environ["FINE_TUNE_ID"],
    )
    print('training_info is', training_info)
