from dotenv import load_dotenv
import pytest
import os
import json
from trainer.api_client.models.record_status_update_json_body import (
    RecordStatusUpdateJsonBody,
)
from trainer.api_client.models.record_status_update_json_body_status import (
    RecordStatusUpdateJsonBodyStatus,
)
from trainer.shared import configured_client
from trainer.api_client.api.default import get_training_info, record_status_update

load_dotenv()


def test_get_training_info():
    training_info = get_training_info.sync(
        client=configured_client,
        fine_tune_id=os.environ["FINE_TUNE_ID"],
    )
    print("training_info is", training_info)


@pytest.mark.focus
def test_mark_deployed():
    resp = record_status_update.sync(
        client=configured_client,
        json_body=RecordStatusUpdateJsonBody(
            fine_tune_id=os.environ["FINE_TUNE_ID"],
            status=RecordStatusUpdateJsonBodyStatus.DEPLOYED,
        ),
    )
    print("resp is", resp)
