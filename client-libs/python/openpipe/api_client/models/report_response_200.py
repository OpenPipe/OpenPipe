from typing import Any, Dict, Type, TypeVar, Union

from attrs import define

from ..models.report_response_200_status_type_0 import ReportResponse200StatusType0
from ..models.report_response_200_status_type_1 import ReportResponse200StatusType1

T = TypeVar("T", bound="ReportResponse200")


@define
class ReportResponse200:
    """
    Attributes:
        status (Union[ReportResponse200StatusType0, ReportResponse200StatusType1]):
    """

    status: Union[ReportResponse200StatusType0, ReportResponse200StatusType1]

    def to_dict(self) -> Dict[str, Any]:
        status: str

        if isinstance(self.status, ReportResponse200StatusType0):
            status = self.status.value

        else:
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

        def _parse_status(data: object) -> Union[ReportResponse200StatusType0, ReportResponse200StatusType1]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                status_type_0 = ReportResponse200StatusType0(data)

                return status_type_0
            except:  # noqa: E722
                pass
            if not isinstance(data, str):
                raise TypeError()
            status_type_1 = ReportResponse200StatusType1(data)

            return status_type_1

        status = _parse_status(d.pop("status"))

        report_response_200 = cls(
            status=status,
        )

        return report_response_200
