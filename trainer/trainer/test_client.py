from dotenv import load_dotenv
import pytest
import os
from trainer.shared import configured_client
from trainer.api_client.api.default import get_training_info

load_dotenv()


def test_get_training_info():
    training_info = get_training_info.sync(
        client=configured_client,
        fine_tune_id=os.environ["FINE_TUNE_ID"],
    )
    print("training_info is", training_info)
