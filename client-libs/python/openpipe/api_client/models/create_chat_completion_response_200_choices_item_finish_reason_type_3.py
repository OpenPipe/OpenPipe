from enum import Enum


class CreateChatCompletionResponse200ChoicesItemFinishReasonType3(str, Enum):
    STOP = "stop"

    def __str__(self) -> str:
        return str(self.value)
