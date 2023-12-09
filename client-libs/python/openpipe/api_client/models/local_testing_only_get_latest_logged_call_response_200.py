import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional, Type, TypeVar, Union

from attrs import define
from dateutil.parser import isoparse

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.local_testing_only_get_latest_logged_call_response_200_tags import (
        LocalTestingOnlyGetLatestLoggedCallResponse200Tags,
    )


T = TypeVar("T", bound="LocalTestingOnlyGetLatestLoggedCallResponse200")


@define
class LocalTestingOnlyGetLatestLoggedCallResponse200:
    """
    Attributes:
        created_at (datetime.datetime):
        tags (LocalTestingOnlyGetLatestLoggedCallResponse200Tags):
        status_code (Optional[float]):
        error_message (Optional[str]):
        req_payload (Union[Unset, Any]):
        resp_payload (Union[Unset, Any]):
    """

    created_at: datetime.datetime
    tags: "LocalTestingOnlyGetLatestLoggedCallResponse200Tags"
    status_code: Optional[float]
    error_message: Optional[str]
    req_payload: Union[Unset, Any] = UNSET
    resp_payload: Union[Unset, Any] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        created_at = self.created_at.isoformat()

        tags = self.tags.to_dict()

        status_code = self.status_code
        error_message = self.error_message
        req_payload = self.req_payload
        resp_payload = self.resp_payload

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "createdAt": created_at,
                "tags": tags,
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
        from ..models.local_testing_only_get_latest_logged_call_response_200_tags import (
            LocalTestingOnlyGetLatestLoggedCallResponse200Tags,
        )

        d = src_dict.copy()
        created_at = isoparse(d.pop("createdAt"))

        tags = LocalTestingOnlyGetLatestLoggedCallResponse200Tags.from_dict(d.pop("tags"))

        status_code = d.pop("statusCode")

        error_message = d.pop("errorMessage")

        req_payload = d.pop("reqPayload", UNSET)

        resp_payload = d.pop("respPayload", UNSET)

        local_testing_only_get_latest_logged_call_response_200 = cls(
            created_at=created_at,
            tags=tags,
            status_code=status_code,
            error_message=error_message,
            req_payload=req_payload,
            resp_payload=resp_payload,
        )

        return local_testing_only_get_latest_logged_call_response_200
