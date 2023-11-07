from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemType3Role(str, Enum):
    TOOL = "tool"

    def __str__(self) -> str:
        return str(self.value)
