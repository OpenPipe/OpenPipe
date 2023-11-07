from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadMessagesItemType2Role(str, Enum):
    ASSISTANT = "assistant"

    def __str__(self) -> str:
        return str(self.value)
