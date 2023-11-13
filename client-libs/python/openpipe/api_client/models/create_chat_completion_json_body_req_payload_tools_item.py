from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_tools_item_type import (
    CreateChatCompletionJsonBodyReqPayloadToolsItemType,
)

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_tools_item_function import (
        CreateChatCompletionJsonBodyReqPayloadToolsItemFunction,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadToolsItem")


@define
class CreateChatCompletionJsonBodyReqPayloadToolsItem:
    """
    Attributes:
        function (CreateChatCompletionJsonBodyReqPayloadToolsItemFunction):
        type (CreateChatCompletionJsonBodyReqPayloadToolsItemType):
    """

    function: "CreateChatCompletionJsonBodyReqPayloadToolsItemFunction"
    type: CreateChatCompletionJsonBodyReqPayloadToolsItemType

    def to_dict(self) -> Dict[str, Any]:
        function = self.function.to_dict()

        type = self.type.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "function": function,
                "type": type,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_req_payload_tools_item_function import (
            CreateChatCompletionJsonBodyReqPayloadToolsItemFunction,
        )

        d = src_dict.copy()
        function = CreateChatCompletionJsonBodyReqPayloadToolsItemFunction.from_dict(d.pop("function"))

        type = CreateChatCompletionJsonBodyReqPayloadToolsItemType(d.pop("type"))

        create_chat_completion_json_body_req_payload_tools_item = cls(
            function=function,
            type=type,
        )

        return create_chat_completion_json_body_req_payload_tools_item
