from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar, Union

from attrs import define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.external_api_check_cache_json_body_tags import ExternalApiCheckCacheJsonBodyTags


T = TypeVar("T", bound="ExternalApiCheckCacheJsonBody")


@define
class ExternalApiCheckCacheJsonBody:
    """
    Attributes:
        requested_at (float): Unix timestamp in milliseconds
        req_payload (Union[Unset, Any]): JSON-encoded request payload
        tags (Union[Unset, ExternalApiCheckCacheJsonBodyTags]): Extra tags to attach to the call for filtering. Eg {
            "userId": "123", "promptId": "populate-title" }
    """

    requested_at: float
    req_payload: Union[Unset, Any] = UNSET
    tags: Union[Unset, "ExternalApiCheckCacheJsonBodyTags"] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        requested_at = self.requested_at
        req_payload = self.req_payload
        tags: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.tags, Unset):
            tags = self.tags.to_dict()

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "requestedAt": requested_at,
            }
        )
        if req_payload is not UNSET:
            field_dict["reqPayload"] = req_payload
        if tags is not UNSET:
            field_dict["tags"] = tags

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.external_api_check_cache_json_body_tags import ExternalApiCheckCacheJsonBodyTags

        d = src_dict.copy()
        requested_at = d.pop("requestedAt")

        req_payload = d.pop("reqPayload", UNSET)

        _tags = d.pop("tags", UNSET)
        tags: Union[Unset, ExternalApiCheckCacheJsonBodyTags]
        if isinstance(_tags, Unset):
            tags = UNSET
        else:
            tags = ExternalApiCheckCacheJsonBodyTags.from_dict(_tags)

        external_api_check_cache_json_body = cls(
            requested_at=requested_at,
            req_payload=req_payload,
            tags=tags,
        )

        return external_api_check_cache_json_body
