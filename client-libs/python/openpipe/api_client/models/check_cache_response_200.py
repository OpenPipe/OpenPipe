from typing import Any, Dict, Type, TypeVar, Union

from attrs import define

from ..types import UNSET, Unset

T = TypeVar("T", bound="CheckCacheResponse200")


@define
class CheckCacheResponse200:
    """
    Attributes:
        resp_payload (Union[Unset, Any]): JSON-encoded response payload
    """

    resp_payload: Union[Unset, Any] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        resp_payload = self.resp_payload

        field_dict: Dict[str, Any] = {}
        field_dict.update({})
        if resp_payload is not UNSET:
            field_dict["respPayload"] = resp_payload

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        resp_payload = d.pop("respPayload", UNSET)

        check_cache_response_200 = cls(
            resp_payload=resp_payload,
        )

        return check_cache_response_200
