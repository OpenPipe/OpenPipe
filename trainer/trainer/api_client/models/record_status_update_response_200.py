from typing import Any, Dict, Type, TypeVar, Union

from attrs import define as _attrs_define

from ..models.record_status_update_response_200_status_type_0 import RecordStatusUpdateResponse200StatusType0
from ..models.record_status_update_response_200_status_type_1 import RecordStatusUpdateResponse200StatusType1

T = TypeVar("T", bound="RecordStatusUpdateResponse200")


@_attrs_define
class RecordStatusUpdateResponse200:
    """
    Attributes:
        status (Union[RecordStatusUpdateResponse200StatusType0, RecordStatusUpdateResponse200StatusType1]):
    """

    status: Union[RecordStatusUpdateResponse200StatusType0, RecordStatusUpdateResponse200StatusType1]

    def to_dict(self) -> Dict[str, Any]:
        status: str

        if isinstance(self.status, RecordStatusUpdateResponse200StatusType0):
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

        def _parse_status(
            data: object,
        ) -> Union[RecordStatusUpdateResponse200StatusType0, RecordStatusUpdateResponse200StatusType1]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                status_type_0 = RecordStatusUpdateResponse200StatusType0(data)

                return status_type_0
            except:  # noqa: E722
                pass
            if not isinstance(data, str):
                raise TypeError()
            status_type_1 = RecordStatusUpdateResponse200StatusType1(data)

            return status_type_1

        status = _parse_status(d.pop("status"))

        record_status_update_response_200 = cls(
            status=status,
        )

        return record_status_update_response_200
