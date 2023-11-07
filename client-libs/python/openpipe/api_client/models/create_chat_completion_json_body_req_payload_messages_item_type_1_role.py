from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadMessagesItemType1Role(str, Enum):
    USER = "user"

    def __str__(self) -> str:
        return str(self.value)
