from enum import Enum


class GetTrainingInfoResponse200TrainingConfigAdapter(str, Enum):
    LORA = "lora"
    QLORA = "qlora"

    def __str__(self) -> str:
        return str(self.value)
