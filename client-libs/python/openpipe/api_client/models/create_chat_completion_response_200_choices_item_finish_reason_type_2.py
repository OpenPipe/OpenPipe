from enum import Enum


class CreateChatCompletionResponse200ChoicesItemFinishReasonType2(str, Enum):
    FUNCTION_CALL = "function_call"

    def __str__(self) -> str:
        return str(self.value)
