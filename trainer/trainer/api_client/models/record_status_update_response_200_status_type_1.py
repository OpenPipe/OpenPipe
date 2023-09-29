from enum import Enum


class RecordStatusUpdateResponse200StatusType1(str, Enum):
    ERROR = "error"

    def __str__(self) -> str:
        return str(self.value)
