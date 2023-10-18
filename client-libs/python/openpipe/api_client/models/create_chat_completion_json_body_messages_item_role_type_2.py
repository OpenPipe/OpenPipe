from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemRoleType2(str, Enum):
    SYSTEM = "system"

    def __str__(self) -> str:
        return str(self.value)
