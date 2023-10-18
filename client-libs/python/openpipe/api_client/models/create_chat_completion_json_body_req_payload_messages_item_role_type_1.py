from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType1(str, Enum):
    ASSISTANT = "assistant"

    def __str__(self) -> str:
        return str(self.value)
