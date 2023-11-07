from typing import Any, Dict, Optional, Type, TypeVar, Union, cast

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_messages_item_type_3_content_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType3ContentType1,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_type_3_role import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType3Role,
)
from ..types import UNSET

T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadMessagesItemType3")


@define
class CreateChatCompletionJsonBodyReqPayloadMessagesItemType3:
    """
    Attributes:
        role (CreateChatCompletionJsonBodyReqPayloadMessagesItemType3Role):
        content (Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType3ContentType1, str]):
        tool_call_id (str):
    """

    role: CreateChatCompletionJsonBodyReqPayloadMessagesItemType3Role
    content: Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType3ContentType1, str]
    tool_call_id: str

    def to_dict(self) -> Dict[str, Any]:
        role = self.role.value

        content: str

        if isinstance(self.content, CreateChatCompletionJsonBodyReqPayloadMessagesItemType3ContentType1):
            content = self.content.value if self.content else None

        else:
            content = self.content

        tool_call_id = self.tool_call_id

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "role": role,
                "content": content,
                "tool_call_id": tool_call_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        role = CreateChatCompletionJsonBodyReqPayloadMessagesItemType3Role(d.pop("role"))

        def _parse_content(
            data: object,
        ) -> Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType3ContentType1, str]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _content_type_1 = data
                content_type_1: Optional[CreateChatCompletionJsonBodyReqPayloadMessagesItemType3ContentType1]
                if _content_type_1 is None:
                    content_type_1 = UNSET
                else:
                    content_type_1 = CreateChatCompletionJsonBodyReqPayloadMessagesItemType3ContentType1(
                        _content_type_1
                    )

                return content_type_1
            except:  # noqa: E722
                pass
            return cast(Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType3ContentType1, str], data)

        content = _parse_content(d.pop("content"))

        tool_call_id = d.pop("tool_call_id")

        create_chat_completion_json_body_req_payload_messages_item_type_3 = cls(
            role=role,
            content=content,
            tool_call_id=tool_call_id,
        )

        return create_chat_completion_json_body_req_payload_messages_item_type_3
