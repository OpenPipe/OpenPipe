from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemType2ToolCallsItemType(str, Enum):
    FUNCTION = "function"

    def __str__(self) -> str:
        return str(self.value)
