from typing import Any, Dict, Type, TypeVar

from attrs import define

T = TypeVar("T", bound="CreateChatCompletionResponse200ChoicesItemMessageFunctionCall")


@define
class CreateChatCompletionResponse200ChoicesItemMessageFunctionCall:
    """
    Attributes:
        name (str):
        arguments (str):
    """

    name: str
    arguments: str

    def to_dict(self) -> Dict[str, Any]:
        name = self.name
        arguments = self.arguments

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "name": name,
                "arguments": arguments,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        name = d.pop("name")

        arguments = d.pop("arguments")

        create_chat_completion_response_200_choices_item_message_function_call = cls(
            name=name,
            arguments=arguments,
        )

        return create_chat_completion_response_200_choices_item_message_function_call
