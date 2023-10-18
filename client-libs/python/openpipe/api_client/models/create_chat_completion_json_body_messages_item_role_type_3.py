from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemRoleType3(str, Enum):
    FUNCTION = "function"

    def __str__(self) -> str:
        return str(self.value)
