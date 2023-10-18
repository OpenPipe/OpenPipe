from typing import TYPE_CHECKING, Any, Dict, Optional, Type, TypeVar, Union, cast

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_messages_item_content_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_role_type_0 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType0,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_role_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType1,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_role_type_2 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType2,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_role_type_3 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType3,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_messages_item_function_call import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemFunctionCall,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadMessagesItem")


@define
class CreateChatCompletionJsonBodyReqPayloadMessagesItem:
    """
    Attributes:
        role (Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType0,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType1,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType2,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType3]):
        content (Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1, str]):
        function_call (Union[Unset, CreateChatCompletionJsonBodyReqPayloadMessagesItemFunctionCall]):
    """

    role: Union[
        CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType0,
        CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType1,
        CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType2,
        CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType3,
    ]
    content: Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1, str]
    function_call: Union[Unset, "CreateChatCompletionJsonBodyReqPayloadMessagesItemFunctionCall"] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        role: str

        if isinstance(self.role, CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType0):
            role = self.role.value

        elif isinstance(self.role, CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType1):
            role = self.role.value

        elif isinstance(self.role, CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType2):
            role = self.role.value

        else:
            role = self.role.value

        content: str

        if isinstance(self.content, CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1):
            content = self.content.value if self.content else None

        else:
            content = self.content

        function_call: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.function_call, Unset):
            function_call = self.function_call.to_dict()

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "role": role,
                "content": content,
            }
        )
        if function_call is not UNSET:
            field_dict["function_call"] = function_call

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_req_payload_messages_item_function_call import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemFunctionCall,
        )

        d = src_dict.copy()

        def _parse_role(
            data: object,
        ) -> Union[
            CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType0,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType1,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType2,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType3,
        ]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                role_type_0 = CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType0(data)

                return role_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                role_type_1 = CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType1(data)

                return role_type_1
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                role_type_2 = CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType2(data)

                return role_type_2
            except:  # noqa: E722
                pass
            if not isinstance(data, str):
                raise TypeError()
            role_type_3 = CreateChatCompletionJsonBodyReqPayloadMessagesItemRoleType3(data)

            return role_type_3

        role = _parse_role(d.pop("role"))

        def _parse_content(data: object) -> Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1, str]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _content_type_1 = data
                content_type_1: Optional[CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1]
                if _content_type_1 is None:
                    content_type_1 = UNSET
                else:
                    content_type_1 = CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1(_content_type_1)

                return content_type_1
            except:  # noqa: E722
                pass
            return cast(Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemContentType1, str], data)

        content = _parse_content(d.pop("content"))

        _function_call = d.pop("function_call", UNSET)
        function_call: Union[Unset, CreateChatCompletionJsonBodyReqPayloadMessagesItemFunctionCall]
        if isinstance(_function_call, Unset):
            function_call = UNSET
        else:
            function_call = CreateChatCompletionJsonBodyReqPayloadMessagesItemFunctionCall.from_dict(_function_call)

        create_chat_completion_json_body_req_payload_messages_item = cls(
            role=role,
            content=content,
            function_call=function_call,
        )

        return create_chat_completion_json_body_req_payload_messages_item
