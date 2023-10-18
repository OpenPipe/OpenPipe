from typing import Any, Dict, Type, TypeVar

from attrs import define

T = TypeVar("T", bound="CreateChatCompletionJsonBodyFunctionCallType2")


@define
class CreateChatCompletionJsonBodyFunctionCallType2:
    """
    Attributes:
        name (str):
    """

    name: str

    def to_dict(self) -> Dict[str, Any]:
        name = self.name

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "name": name,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        name = d.pop("name")

        create_chat_completion_json_body_function_call_type_2 = cls(
            name=name,
        )

        return create_chat_completion_json_body_function_call_type_2
