from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar, Union

from attrs import define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.report_json_body_tags import ReportJsonBodyTags


T = TypeVar("T", bound="ReportJsonBody")


@define
class ReportJsonBody:
    """
    Attributes:
        requested_at (float): Unix timestamp in milliseconds
        received_at (float): Unix timestamp in milliseconds
        req_payload (Union[Unset, Any]): JSON-encoded request payload
        resp_payload (Union[Unset, Any]): JSON-encoded response payload
        status_code (Union[Unset, float]): HTTP status code of response
        error_message (Union[Unset, str]): User-friendly error message
        tags (Union[Unset, ReportJsonBodyTags]): Extra tags to attach to the call for filtering. Eg { "userId": "123",
            "promptId": "populate-title" }
    """

    requested_at: float
    received_at: float
    req_payload: Union[Unset, Any] = UNSET
    resp_payload: Union[Unset, Any] = UNSET
    status_code: Union[Unset, float] = UNSET
    error_message: Union[Unset, str] = UNSET
    tags: Union[Unset, "ReportJsonBodyTags"] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        requested_at = self.requested_at
        received_at = self.received_at
        req_payload = self.req_payload
        resp_payload = self.resp_payload
        status_code = self.status_code
        error_message = self.error_message
        tags: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.tags, Unset):
            tags = self.tags.to_dict()

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "requestedAt": requested_at,
                "receivedAt": received_at,
            }
        )
        if req_payload is not UNSET:
            field_dict["reqPayload"] = req_payload
        if resp_payload is not UNSET:
            field_dict["respPayload"] = resp_payload
        if status_code is not UNSET:
            field_dict["statusCode"] = status_code
        if error_message is not UNSET:
            field_dict["errorMessage"] = error_message
        if tags is not UNSET:
            field_dict["tags"] = tags

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.report_json_body_tags import ReportJsonBodyTags

        d = src_dict.copy()
        requested_at = d.pop("requestedAt")

        received_at = d.pop("receivedAt")

        req_payload = d.pop("reqPayload", UNSET)

        resp_payload = d.pop("respPayload", UNSET)

        status_code = d.pop("statusCode", UNSET)

        error_message = d.pop("errorMessage", UNSET)

        _tags = d.pop("tags", UNSET)
        tags: Union[Unset, ReportJsonBodyTags]
        if isinstance(_tags, Unset):
            tags = UNSET
        else:
            tags = ReportJsonBodyTags.from_dict(_tags)

        report_json_body = cls(
            requested_at=requested_at,
            received_at=received_at,
            req_payload=req_payload,
            resp_payload=resp_payload,
            status_code=status_code,
            error_message=error_message,
            tags=tags,
        )

        return report_json_body
