from enum import Enum


class ReportResponse200StatusType1(str, Enum):
    ERROR = "error"

    def __str__(self) -> str:
        return str(self.value)
