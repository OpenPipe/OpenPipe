from typing import Any, Dict, Optional, Type, TypeVar, Union, cast

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_messages_item_type_4_content_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType4ContentType1,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_type_4_role import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType4Role,
)
from ..types import UNSET

T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadMessagesItemType4")


@define
class CreateChatCompletionJsonBodyReqPayloadMessagesItemType4:
    """
    Attributes:
        role (CreateChatCompletionJsonBodyReqPayloadMessagesItemType4Role):
        name (str):
        content (Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType4ContentType1, str]):
    """

    role: CreateChatCompletionJsonBodyReqPayloadMessagesItemType4Role
    name: str
    content: Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType4ContentType1, str]

    def to_dict(self) -> Dict[str, Any]:
        role = self.role.value

        name = self.name
        content: str

        if isinstance(self.content, CreateChatCompletionJsonBodyReqPayloadMessagesItemType4ContentType1):
            content = self.content.value if self.content else None

        else:
            content = self.content

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "role": role,
                "name": name,
                "content": content,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        role = CreateChatCompletionJsonBodyReqPayloadMessagesItemType4Role(d.pop("role"))

        name = d.pop("name")

        def _parse_content(
            data: object,
        ) -> Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType4ContentType1, str]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _content_type_1 = data
                content_type_1: Optional[CreateChatCompletionJsonBodyReqPayloadMessagesItemType4ContentType1]
                if _content_type_1 is None:
                    content_type_1 = UNSET
                else:
                    content_type_1 = CreateChatCompletionJsonBodyReqPayloadMessagesItemType4ContentType1(
                        _content_type_1
                    )

                return content_type_1
            except:  # noqa: E722
                pass
            return cast(Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType4ContentType1, str], data)

        content = _parse_content(d.pop("content"))

        create_chat_completion_json_body_req_payload_messages_item_type_4 = cls(
            role=role,
            name=name,
            content=content,
        )

        return create_chat_completion_json_body_req_payload_messages_item_type_4
