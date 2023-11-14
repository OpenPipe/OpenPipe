from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar

from attrs import define

from ..models.create_chat_completion_json_body_tools_item_type import CreateChatCompletionJsonBodyToolsItemType

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_tools_item_function import (
        CreateChatCompletionJsonBodyToolsItemFunction,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyToolsItem")


@define
class CreateChatCompletionJsonBodyToolsItem:
    """
    Attributes:
        function (CreateChatCompletionJsonBodyToolsItemFunction):
        type (CreateChatCompletionJsonBodyToolsItemType):
    """

    function: "CreateChatCompletionJsonBodyToolsItemFunction"
    type: CreateChatCompletionJsonBodyToolsItemType

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
        from ..models.create_chat_completion_json_body_tools_item_function import (
            CreateChatCompletionJsonBodyToolsItemFunction,
        )

        d = src_dict.copy()
        function = CreateChatCompletionJsonBodyToolsItemFunction.from_dict(d.pop("function"))

        type = CreateChatCompletionJsonBodyToolsItemType(d.pop("type"))

        create_chat_completion_json_body_tools_item = cls(
            function=function,
            type=type,
        )

        return create_chat_completion_json_body_tools_item
