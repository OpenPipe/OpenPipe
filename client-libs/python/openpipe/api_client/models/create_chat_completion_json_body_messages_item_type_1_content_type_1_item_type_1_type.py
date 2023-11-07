from enum import Enum


class CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1Type(str, Enum):
    TEXT = "text"

    def __str__(self) -> str:
        return str(self.value)
