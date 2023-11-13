from enum import Enum


class CreateChatCompletionJsonBodyToolChoiceType1(str, Enum):
    AUTO = "auto"

    def __str__(self) -> str:
        return str(self.value)
