from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadMessagesItemType0Role(str, Enum):
    SYSTEM = "system"

    def __str__(self) -> str:
        return str(self.value)
