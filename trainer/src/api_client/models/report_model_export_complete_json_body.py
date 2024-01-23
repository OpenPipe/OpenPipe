from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="ReportModelExportCompleteJsonBody")


@_attrs_define
class ReportModelExportCompleteJsonBody:
    """
    Attributes:
        export_id (str):
    """

    export_id: str

    def to_dict(self) -> Dict[str, Any]:
        export_id = self.export_id

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "exportId": export_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        export_id = d.pop("exportId")

        report_model_export_complete_json_body = cls(
            export_id=export_id,
        )

        return report_model_export_complete_json_body
