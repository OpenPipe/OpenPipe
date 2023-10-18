from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1(str, Enum):
    NULL = "null"

    def __str__(self) -> str:
        return str(self.value)
