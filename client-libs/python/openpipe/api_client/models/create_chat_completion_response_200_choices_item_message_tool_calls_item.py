from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar

from attrs import define

from ..models.create_chat_completion_response_200_choices_item_message_tool_calls_item_type import (
    CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemType,
)

if TYPE_CHECKING:
    from ..models.create_chat_completion_response_200_choices_item_message_tool_calls_item_function import (
        CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemFunction,
    )


T = TypeVar("T", bound="CreateChatCompletionResponse200ChoicesItemMessageToolCallsItem")


@define
class CreateChatCompletionResponse200ChoicesItemMessageToolCallsItem:
    """
    Attributes:
        id (str):
        function (CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemFunction):
        type (CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemType):
    """

    id: str
    function: "CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemFunction"
    type: CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemType

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
        from ..models.create_chat_completion_response_200_choices_item_message_tool_calls_item_function import (
            CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemFunction,
        )

        d = src_dict.copy()
        id = d.pop("id")

        function = CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemFunction.from_dict(d.pop("function"))

        type = CreateChatCompletionResponse200ChoicesItemMessageToolCallsItemType(d.pop("type"))

        create_chat_completion_response_200_choices_item_message_tool_calls_item = cls(
            id=id,
            function=function,
            type=type,
        )

        return create_chat_completion_response_200_choices_item_message_tool_calls_item
