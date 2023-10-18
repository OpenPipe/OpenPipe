from enum import Enum


class CreateChatCompletionJsonBodyReqPayloadFunctionCallType1(str, Enum):
    AUTO = "auto"

    def __str__(self) -> str:
        return str(self.value)
