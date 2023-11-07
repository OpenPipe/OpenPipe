from enum import Enum


class CreateChatCompletionResponse200ChoicesItemFinishReasonType2(str, Enum):
    TOOL_CALLS = "tool_calls"

    def __str__(self) -> str:
        return str(self.value)
