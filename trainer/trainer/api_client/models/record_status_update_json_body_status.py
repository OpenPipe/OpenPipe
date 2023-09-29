from enum import Enum


class RecordStatusUpdateJsonBodyStatus(str, Enum):
    AWAITING_DEPLOYMENT = "AWAITING_DEPLOYMENT"
    DEPLOYED = "DEPLOYED"
    DEPLOYING = "DEPLOYING"
    ERROR = "ERROR"
    PENDING = "PENDING"
    TRAINING = "TRAINING"
    UPLOADING_DATASET = "UPLOADING_DATASET"

    def __str__(self) -> str:
        return str(self.value)
