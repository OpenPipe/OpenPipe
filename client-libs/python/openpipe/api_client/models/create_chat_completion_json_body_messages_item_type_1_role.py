from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemType1Role(str, Enum):
    USER = "user"

    def __str__(self) -> str:
        return str(self.value)
