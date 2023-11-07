from enum import Enum


class CreateChatCompletionResponse200ChoicesItemFinishReasonType1(str, Enum):
    FUNCTION_CALL = "function_call"

    def __str__(self) -> str:
        return str(self.value)
