import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional, Type, TypeVar

from attrs import define
from dateutil.parser import isoparse

if TYPE_CHECKING:
    from ..models.local_testing_only_get_latest_logged_call_response_200_model_response import (
        LocalTestingOnlyGetLatestLoggedCallResponse200ModelResponse,
    )
    from ..models.local_testing_only_get_latest_logged_call_response_200_tags import (
        LocalTestingOnlyGetLatestLoggedCallResponse200Tags,
    )


T = TypeVar("T", bound="LocalTestingOnlyGetLatestLoggedCallResponse200")


@define
class LocalTestingOnlyGetLatestLoggedCallResponse200:
    """
    Attributes:
        created_at (datetime.datetime):
        cache_hit (bool):
        tags (LocalTestingOnlyGetLatestLoggedCallResponse200Tags):
        model_response (Optional[LocalTestingOnlyGetLatestLoggedCallResponse200ModelResponse]):
    """

    created_at: datetime.datetime
    cache_hit: bool
    tags: "LocalTestingOnlyGetLatestLoggedCallResponse200Tags"
    model_response: Optional["LocalTestingOnlyGetLatestLoggedCallResponse200ModelResponse"]

    def to_dict(self) -> Dict[str, Any]:
        created_at = self.created_at.isoformat()

        cache_hit = self.cache_hit
        tags = self.tags.to_dict()

        model_response = self.model_response.to_dict() if self.model_response else None

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "createdAt": created_at,
                "cacheHit": cache_hit,
                "tags": tags,
                "modelResponse": model_response,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.local_testing_only_get_latest_logged_call_response_200_model_response import (
            LocalTestingOnlyGetLatestLoggedCallResponse200ModelResponse,
        )
        from ..models.local_testing_only_get_latest_logged_call_response_200_tags import (
            LocalTestingOnlyGetLatestLoggedCallResponse200Tags,
        )

        d = src_dict.copy()
        created_at = isoparse(d.pop("createdAt"))

        cache_hit = d.pop("cacheHit")

        tags = LocalTestingOnlyGetLatestLoggedCallResponse200Tags.from_dict(d.pop("tags"))

        _model_response = d.pop("modelResponse")
        model_response: Optional[LocalTestingOnlyGetLatestLoggedCallResponse200ModelResponse]
        if _model_response is None:
            model_response = None
        else:
            model_response = LocalTestingOnlyGetLatestLoggedCallResponse200ModelResponse.from_dict(_model_response)

        local_testing_only_get_latest_logged_call_response_200 = cls(
            created_at=created_at,
            cache_hit=cache_hit,
            tags=tags,
            model_response=model_response,
        )

        return local_testing_only_get_latest_logged_call_response_200
