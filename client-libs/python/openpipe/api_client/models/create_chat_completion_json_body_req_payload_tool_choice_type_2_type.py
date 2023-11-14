from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Type(str, Enum):
    FUNCTION = "function"

    def __str__(self) -> str:
        return str(self.value)
