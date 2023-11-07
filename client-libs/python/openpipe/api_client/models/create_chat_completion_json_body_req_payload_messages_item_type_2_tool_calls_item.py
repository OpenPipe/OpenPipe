from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_tool_calls_item_type import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemType,
)

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_tool_calls_item_function import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemFunction,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItem")


@define
class CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItem:
    """
    Attributes:
        id (str):
        function (CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemFunction):
        type (CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemType):
    """

    id: str
    function: "CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemFunction"
    type: CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemType

    def to_dict(self) -> Dict[str, Any]:
        id = self.id
        function = self.function.to_dict()

        type = self.type.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "id": id,
                "function": function,
                "type": type,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2_tool_calls_item_function import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemFunction,
        )

        d = src_dict.copy()
        id = d.pop("id")

        function = CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemFunction.from_dict(
            d.pop("function")
        )

        type = CreateChatCompletionJsonBodyReqPayloadMessagesItemType2ToolCallsItemType(d.pop("type"))

        create_chat_completion_json_body_req_payload_messages_item_type_2_tool_calls_item = cls(
            id=id,
            function=function,
            type=type,
        )

        return create_chat_completion_json_body_req_payload_messages_item_type_2_tool_calls_item
