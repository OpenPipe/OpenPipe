from enum import Enum


class CreateChatCompletionResponse200ChoicesItemMessageRole(str, Enum):
    ASSISTANT = "assistant"

    def __str__(self) -> str:
        return str(self.value)
