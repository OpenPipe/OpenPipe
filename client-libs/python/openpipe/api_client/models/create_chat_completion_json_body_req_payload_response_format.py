from typing import Any, Dict, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_response_format_type_type_0 import (
    CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType0,
)
from ..models.create_chat_completion_json_body_req_payload_response_format_type_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType1,
)

T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadResponseFormat")


@define
class CreateChatCompletionJsonBodyReqPayloadResponseFormat:
    """
    Attributes:
        type (Union[CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType0,
            CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType1]):
    """

    type: Union[
        CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType0,
        CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType1,
    ]

    def to_dict(self) -> Dict[str, Any]:
        type: str

        if isinstance(self.type, CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType0):
            type = self.type.value

        else:
            type = self.type.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "type": type,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()

        def _parse_type(
            data: object,
        ) -> Union[
            CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType0,
            CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType1,
        ]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                type_type_0 = CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType0(data)

                return type_type_0
            except:  # noqa: E722
                pass
            if not isinstance(data, str):
                raise TypeError()
            type_type_1 = CreateChatCompletionJsonBodyReqPayloadResponseFormatTypeType1(data)

            return type_type_1

        type = _parse_type(d.pop("type"))

        create_chat_completion_json_body_req_payload_response_format = cls(
            type=type,
        )

        return create_chat_completion_json_body_req_payload_response_format
