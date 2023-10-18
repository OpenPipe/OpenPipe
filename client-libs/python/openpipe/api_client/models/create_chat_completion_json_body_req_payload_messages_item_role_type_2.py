from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType2(str, Enum):
    SYSTEM = "system"

    def __str__(self) -> str:
        return str(self.value)
