from enum import Enum


class CreateChatCompletionResponse200ChoicesItemMessageRoleType3(str, Enum):
    FUNCTION = "function"

    def __str__(self) -> str:
        return str(self.value)
