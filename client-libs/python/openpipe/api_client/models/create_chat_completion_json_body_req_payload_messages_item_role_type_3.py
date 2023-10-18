from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType3(str, Enum):
    FUNCTION = "function"

    def __str__(self) -> str:
        return str(self.value)
