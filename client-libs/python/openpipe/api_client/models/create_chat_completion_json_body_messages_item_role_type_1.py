from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemRoleType1(str, Enum):
    ASSISTANT = "assistant"

    def __str__(self) -> str:
        return str(self.value)
