from enum import Enum


class ReportResponse200StatusType0(str, Enum):
    OK = "ok"

    def __str__(self) -> str:
        return str(self.value)
