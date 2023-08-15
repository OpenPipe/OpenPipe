from typing import Any, Dict, Optional, Type, TypeVar, Union

from attrs import define

from ..types import UNSET, Unset

T = TypeVar("T", bound="LocalTestingOnlyGetLatestLoggedCallResponse200ModelResponse")


@define
class LocalTestingOnlyGetLatestLoggedCallResponse200ModelResponse:
    """
    Attributes:
        id (str):
        status_code (Optional[float]):
        error_message (Optional[str]):
        req_payload (Union[Unset, Any]):
        resp_payload (Union[Unset, Any]):
    """

    id: str
    status_code: Optional[float]
    error_message: Optional[str]
    req_payload: Union[Unset, Any] = UNSET
    resp_payload: Union[Unset, Any] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        id = self.id
        status_code = self.status_code
        error_message = self.error_message
        req_payload = self.req_payload
        resp_payload = self.resp_payload

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "id": id,
                "statusCode": status_code,
                "errorMessage": error_message,
            }
        )
        if req_payload is not UNSET:
            field_dict["reqPayload"] = req_payload
        if resp_payload is not UNSET:
            field_dict["respPayload"] = resp_payload

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        id = d.pop("id")

        status_code = d.pop("statusCode")

        error_message = d.pop("errorMessage")

        req_payload = d.pop("reqPayload", UNSET)

        resp_payload = d.pop("respPayload", UNSET)

        local_testing_only_get_latest_logged_call_response_200_model_response = cls(
            id=id,
            status_code=status_code,
            error_message=error_message,
            req_payload=req_payload,
            resp_payload=resp_payload,
        )

        return local_testing_only_get_latest_logged_call_response_200_model_response
