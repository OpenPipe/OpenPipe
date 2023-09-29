from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

from ..models.record_status_update_json_body_status import RecordStatusUpdateJsonBodyStatus

T = TypeVar("T", bound="RecordStatusUpdateJsonBody")


@_attrs_define
class RecordStatusUpdateJsonBody:
    """
    Attributes:
        fine_tune_id (str):
        status (RecordStatusUpdateJsonBodyStatus):
    """

    fine_tune_id: str
    status: RecordStatusUpdateJsonBodyStatus

    def to_dict(self) -> Dict[str, Any]:
        fine_tune_id = self.fine_tune_id
        status = self.status.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "fineTuneId": fine_tune_id,
                "status": status,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        fine_tune_id = d.pop("fineTuneId")

        status = RecordStatusUpdateJsonBodyStatus(d.pop("status"))

        record_status_update_json_body = cls(
            fine_tune_id=fine_tune_id,
            status=status,
        )

        return record_status_update_json_body
