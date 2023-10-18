from enum import Enum


class CreateChatCompletionResponse200ChoicesItemFinishReasonType1(str, Enum):
    LENGTH = "length"

    def __str__(self) -> str:
        return str(self.value)
