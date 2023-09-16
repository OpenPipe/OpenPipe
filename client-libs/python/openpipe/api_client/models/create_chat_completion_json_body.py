from typing import Any, Dict, Type, TypeVar, Union

from attrs import define

from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateChatCompletionJsonBody")


@define
class CreateChatCompletionJsonBody:
    """
    Attributes:
        req_payload (Union[Unset, Any]): JSON-encoded request payload
    """

    req_payload: Union[Unset, Any] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        req_payload = self.req_payload

        field_dict: Dict[str, Any] = {}
        field_dict.update({})
        if req_payload is not UNSET:
            field_dict["reqPayload"] = req_payload

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        req_payload = d.pop("reqPayload", UNSET)

        create_chat_completion_json_body = cls(
            req_payload=req_payload,
        )

        return create_chat_completion_json_body
