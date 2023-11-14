from typing import Any, Dict, Type, TypeVar

from attrs import define

T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Function")


@define
class CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Function:
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

        create_chat_completion_json_body_req_payload_tool_choice_type_2_function = cls(
            name=name,
        )

        return create_chat_completion_json_body_req_payload_tool_choice_type_2_function
