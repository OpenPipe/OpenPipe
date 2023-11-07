from typing import Any, Dict, Type, TypeVar

from attrs import define

from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_1_type import (
    CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1Type,
)

T = TypeVar("T", bound="CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1")


@define
class CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1:
    """
    Attributes:
        type (CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1Type):
        text (str):
    """

    type: CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1Type
    text: str

    def to_dict(self) -> Dict[str, Any]:
        type = self.type.value

        text = self.text

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "type": type,
                "text": text,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        type = CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1Type(d.pop("type"))

        text = d.pop("text")

        create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_1 = cls(
            type=type,
            text=text,
        )

        return create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_1
