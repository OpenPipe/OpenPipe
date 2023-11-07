from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemType4Role(str, Enum):
    FUNCTION = "function"

    def __str__(self) -> str:
        return str(self.value)
