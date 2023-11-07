from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemType1ContentType2(str, Enum):
    NULL = "null"

    def __str__(self) -> str:
        return str(self.value)
