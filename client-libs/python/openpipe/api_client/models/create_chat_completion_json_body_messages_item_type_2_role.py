from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemType2Role(str, Enum):
    ASSISTANT = "assistant"

    def __str__(self) -> str:
        return str(self.value)
