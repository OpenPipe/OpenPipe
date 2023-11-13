from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_tool_choice_type_2_type import (
    CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Type,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_tool_choice_type_2_function import (
        CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Function,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadToolChoiceType2")


@define
class CreateChatCompletionJsonBodyReqPayloadToolChoiceType2:
    """
    Attributes:
        type (Union[Unset, CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Type]):
        function (Union[Unset, CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Function]):
    """

    type: Union[Unset, CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Type] = UNSET
    function: Union[Unset, "CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Function"] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        type: Union[Unset, str] = UNSET
        if not isinstance(self.type, Unset):
            type = self.type.value

        function: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.function, Unset):
            function = self.function.to_dict()

        field_dict: Dict[str, Any] = {}
        field_dict.update({})
        if type is not UNSET:
            field_dict["type"] = type
        if function is not UNSET:
            field_dict["function"] = function

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_req_payload_tool_choice_type_2_function import (
            CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Function,
        )

        d = src_dict.copy()
        _type = d.pop("type", UNSET)
        type: Union[Unset, CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Type]
        if isinstance(_type, Unset):
            type = UNSET
        else:
            type = CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Type(_type)

        _function = d.pop("function", UNSET)
        function: Union[Unset, CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Function]
        if isinstance(_function, Unset):
            function = UNSET
        else:
            function = CreateChatCompletionJsonBodyReqPayloadToolChoiceType2Function.from_dict(_function)

        create_chat_completion_json_body_req_payload_tool_choice_type_2 = cls(
            type=type,
            function=function,
        )

        return create_chat_completion_json_body_req_payload_tool_choice_type_2
