from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar, Union

from attrs import define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.check_cache_json_body_tags import CheckCacheJsonBodyTags


T = TypeVar("T", bound="CheckCacheJsonBody")


@define
class CheckCacheJsonBody:
    """
    Attributes:
        requested_at (float): Unix timestamp in milliseconds
        req_payload (Union[Unset, Any]): JSON-encoded request payload
        tags (Union[Unset, CheckCacheJsonBodyTags]): Extra tags to attach to the call for filtering. Eg { "userId":
            "123", "promptId": "populate-title" }
    """

    requested_at: float
    req_payload: Union[Unset, Any] = UNSET
    tags: Union[Unset, "CheckCacheJsonBodyTags"] = UNSET

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
        from ..models.check_cache_json_body_tags import CheckCacheJsonBodyTags

        d = src_dict.copy()
        requested_at = d.pop("requestedAt")

        req_payload = d.pop("reqPayload", UNSET)

        _tags = d.pop("tags", UNSET)
        tags: Union[Unset, CheckCacheJsonBodyTags]
        if isinstance(_tags, Unset):
            tags = UNSET
        else:
            tags = CheckCacheJsonBodyTags.from_dict(_tags)

        check_cache_json_body = cls(
            requested_at=requested_at,
            req_payload=req_payload,
            tags=tags,
        )

        return check_cache_json_body
