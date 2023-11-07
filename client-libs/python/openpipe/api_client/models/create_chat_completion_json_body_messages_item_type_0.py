from typing import Any, Dict, Optional, Type, TypeVar, Union, cast

from attrs import define

from ..models.create_chat_completion_json_body_messages_item_type_0_content_type_1 import (
    CreateChatCompletionJsonBodyMessagesItemType0ContentType1,
)
from ..models.create_chat_completion_json_body_messages_item_type_0_role import (
    CreateChatCompletionJsonBodyMessagesItemType0Role,
)
from ..types import UNSET

T = TypeVar("T", bound="CreateChatCompletionJsonBodyMessagesItemType0")


@define
class CreateChatCompletionJsonBodyMessagesItemType0:
    """
    Attributes:
        role (CreateChatCompletionJsonBodyMessagesItemType0Role):
        content (Union[CreateChatCompletionJsonBodyMessagesItemType0ContentType1, str]):
    """

    role: CreateChatCompletionJsonBodyMessagesItemType0Role
    content: Union[CreateChatCompletionJsonBodyMessagesItemType0ContentType1, str]

    def to_dict(self) -> Dict[str, Any]:
        role = self.role.value

        content: str

        if isinstance(self.content, CreateChatCompletionJsonBodyMessagesItemType0ContentType1):
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
        role = CreateChatCompletionJsonBodyMessagesItemType0Role(d.pop("role"))

        def _parse_content(data: object) -> Union[CreateChatCompletionJsonBodyMessagesItemType0ContentType1, str]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _content_type_1 = data
                content_type_1: Optional[CreateChatCompletionJsonBodyMessagesItemType0ContentType1]
                if _content_type_1 is None:
                    content_type_1 = UNSET
                else:
                    content_type_1 = CreateChatCompletionJsonBodyMessagesItemType0ContentType1(_content_type_1)

                return content_type_1
            except:  # noqa: E722
                pass
            return cast(Union[CreateChatCompletionJsonBodyMessagesItemType0ContentType1, str], data)

        content = _parse_content(d.pop("content"))

        create_chat_completion_json_body_messages_item_type_0 = cls(
            role=role,
            content=content,
        )

        return create_chat_completion_json_body_messages_item_type_0
