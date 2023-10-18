from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemContentType1(str, Enum):
    NULL = "null"

    def __str__(self) -> str:
        return str(self.value)
