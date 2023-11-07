from enum import Enum


class CreateChatCompletionResponse200ChoicesItemFinishReasonType4(str, Enum):
    CONTENT_FILTER = "content_filter"

    def __str__(self) -> str:
        return str(self.value)
