from enum import Enum


class RecordStatusUpdateResponse200StatusType0(str, Enum):
    OK = "ok"

    def __str__(self) -> str:
        return str(self.value)
