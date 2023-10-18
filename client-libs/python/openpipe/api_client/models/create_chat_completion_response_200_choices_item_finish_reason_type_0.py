from enum import Enum


class CreateChatCompletionResponse200ChoicesItemFinishReasonType0(str, Enum):
    STOP = "stop"

    def __str__(self) -> str:
        return str(self.value)
