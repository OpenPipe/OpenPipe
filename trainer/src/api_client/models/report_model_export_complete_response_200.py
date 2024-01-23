from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="ReportModelExportCompleteResponse200")


@_attrs_define
class ReportModelExportCompleteResponse200:
    """ """

    def to_dict(self) -> Dict[str, Any]:
        field_dict: Dict[str, Any] = {}
        field_dict.update({})

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        src_dict.copy()
        report_model_export_complete_response_200 = cls()

        return report_model_export_complete_response_200
