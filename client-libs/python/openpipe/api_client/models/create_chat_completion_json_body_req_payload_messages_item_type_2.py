from typing import TYPE_CHECKING, Any, Dict, List, Optional, Type, TypeVar, Union, cast

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_content_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ContentType1,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_role import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType2Role,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_function_call import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType2FunctionCall,
    )
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_tool_calls_item import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItem,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadMessagesItemType2")


@define
class CreateChatCompletionJsonBodyReqPayloadMessagesItemType2:
    """
    Attributes:
        role (CreateChatCompletionJsonBodyReqPayloadMessagesItemType2Role):
        content (Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ContentType1, str]):
        function_call (Union[Unset, CreateChatCompletionJsonBodyReqPayloadMessagesItemType2FunctionCall]):
        tool_calls (Union[Unset, List['CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItem']]):
    """

    role: CreateChatCompletionJsonBodyReqPayloadMessagesItemType2Role
    content: Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ContentType1, str]
    function_call: Union[Unset, "CreateChatCompletionJsonBodyReqPayloadMessagesItemType2FunctionCall"] = UNSET
    tool_calls: Union[Unset, List["CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItem"]] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        role = self.role.value

        content: str

        if isinstance(self.content, CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ContentType1):
            content = self.content.value if self.content else None

        else:
            content = self.content

        function_call: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.function_call, Unset):
            function_call = self.function_call.to_dict()

        tool_calls: Union[Unset, List[Dict[str, Any]]] = UNSET
        if not isinstance(self.tool_calls, Unset):
            tool_calls = []
            for tool_calls_item_data in self.tool_calls:
                tool_calls_item = tool_calls_item_data.to_dict()

                tool_calls.append(tool_calls_item)

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "role": role,
                "content": content,
            }
        )
        if function_call is not UNSET:
            field_dict["function_call"] = function_call
        if tool_calls is not UNSET:
            field_dict["tool_calls"] = tool_calls

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_function_call import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType2FunctionCall,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_tool_calls_item import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItem,
        )

        d = src_dict.copy()
        role = CreateChatCompletionJsonBodyReqPayloadMessagesItemType2Role(d.pop("role"))

        def _parse_content(
            data: object,
        ) -> Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ContentType1, str]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _content_type_1 = data
                content_type_1: Optional[CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ContentType1]
                if _content_type_1 is None:
                    content_type_1 = UNSET
                else:
                    content_type_1 = CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ContentType1(
                        _content_type_1
                    )

                return content_type_1
            except:  # noqa: E722
                pass
            return cast(Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ContentType1, str], data)

        content = _parse_content(d.pop("content"))

        _function_call = d.pop("function_call", UNSET)
        function_call: Union[Unset, CreateChatCompletionJsonBodyReqPayloadMessagesItemType2FunctionCall]
        if isinstance(_function_call, Unset):
            function_call = UNSET
        else:
            function_call = CreateChatCompletionJsonBodyReqPayloadMessagesItemType2FunctionCall.from_dict(
                _function_call
            )

        tool_calls = []
        _tool_calls = d.pop("tool_calls", UNSET)
        for tool_calls_item_data in _tool_calls or []:
            tool_calls_item = CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItem.from_dict(
                tool_calls_item_data
            )

            tool_calls.append(tool_calls_item)

        create_chat_completion_json_body_req_payload_messages_item_type_2 = cls(
            role=role,
            content=content,
            function_call=function_call,
            tool_calls=tool_calls,
        )

        return create_chat_completion_json_body_req_payload_messages_item_type_2
