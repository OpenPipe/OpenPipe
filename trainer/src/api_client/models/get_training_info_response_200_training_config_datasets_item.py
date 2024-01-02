from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="GetTrainingInfoResponse200TrainingConfigDatasetsItem")


@_attrs_define
class GetTrainingInfoResponse200TrainingConfigDatasetsItem:
    """
    Attributes:
        path (str):
        type (str):
    """

    path: str
    type: str

    def to_dict(self) -> Dict[str, Any]:
        path = self.path
        type = self.type

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "path": path,
                "type": type,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        path = d.pop("path")

        type = d.pop("type")

        get_training_info_response_200_training_config_datasets_item = cls(
            path=path,
            type=type,
        )

        return get_training_info_response_200_training_config_datasets_item
