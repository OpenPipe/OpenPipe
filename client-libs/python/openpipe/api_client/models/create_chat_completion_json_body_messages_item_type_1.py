from typing import Any, Dict, Optional, Type, TypeVar, Union, cast

from attrs import define

from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1 import (
    CreateChatCompletionJsonBodyMessagesItemType1ContentType1,
)
from ..models.create_chat_completion_json_body_messages_item_type_1_role import (
    CreateChatCompletionJsonBodyMessagesItemType1Role,
)
from ..types import UNSET

T = TypeVar("T", bound="CreateChatCompletionJsonBodyMessagesItemType1")


@define
class CreateChatCompletionJsonBodyMessagesItemType1:
    """
    Attributes:
        role (CreateChatCompletionJsonBodyMessagesItemType1Role):
        content (Union[CreateChatCompletionJsonBodyMessagesItemType1ContentType1, str]):
    """

    role: CreateChatCompletionJsonBodyMessagesItemType1Role
    content: Union[CreateChatCompletionJsonBodyMessagesItemType1ContentType1, str]

    def to_dict(self) -> Dict[str, Any]:
        role = self.role.value

        content: str

        if isinstance(self.content, CreateChatCompletionJsonBodyMessagesItemType1ContentType1):
            content = self.content.value if self.content else None

        else:
            content = self.content

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "role": role,
                "content": content,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        role = CreateChatCompletionJsonBodyMessagesItemType1Role(d.pop("role"))

        def _parse_content(data: object) -> Union[CreateChatCompletionJsonBodyMessagesItemType1ContentType1, str]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _content_type_1 = data
                content_type_1: Optional[CreateChatCompletionJsonBodyMessagesItemType1ContentType1]
                if _content_type_1 is None:
                    content_type_1 = UNSET
                else:
                    content_type_1 = CreateChatCompletionJsonBodyMessagesItemType1ContentType1(_content_type_1)

                return content_type_1
            except:  # noqa: E722
                pass
            return cast(Union[CreateChatCompletionJsonBodyMessagesItemType1ContentType1, str], data)

        content = _parse_content(d.pop("content"))

        create_chat_completion_json_body_messages_item_type_1 = cls(
            role=role,
            content=content,
        )

        return create_chat_completion_json_body_messages_item_type_1
