from enum import Enum


class CreateChatCompletionResponse200ChoicesItemMessageContentType1(str, Enum):
    NULL = "null"

    def __str__(self) -> str:
        return str(self.value)
