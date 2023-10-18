from enum import Enum


class CreateChatCompletionResponse200ChoicesItemMessageRoleType1(str, Enum):
    ASSISTANT = "assistant"

    def __str__(self) -> str:
        return str(self.value)
