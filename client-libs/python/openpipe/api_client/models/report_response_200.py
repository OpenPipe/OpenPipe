from typing import Any, Dict, Type, TypeVar

from attrs import define

from ..models.report_response_200_status import ReportResponse200Status

T = TypeVar("T", bound="ReportResponse200")


@define
class ReportResponse200:
    """
    Attributes:
        status (ReportResponse200Status):
    """

    status: ReportResponse200Status

    def to_dict(self) -> Dict[str, Any]:
        status = self.status.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "status": status,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        status = ReportResponse200Status(d.pop("status"))

        report_response_200 = cls(
            status=status,
        )

        return report_response_200
