from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

from ..models.get_training_info_response_200_base_model import GetTrainingInfoResponse200BaseModel

T = TypeVar("T", bound="GetTrainingInfoResponse200")


@_attrs_define
class GetTrainingInfoResponse200:
    """
    Attributes:
        training_blob_download_url (str):
        base_model (GetTrainingInfoResponse200BaseModel):
    """

    training_blob_download_url: str
    base_model: GetTrainingInfoResponse200BaseModel

    def to_dict(self) -> Dict[str, Any]:
        training_blob_download_url = self.training_blob_download_url
        base_model = self.base_model.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "trainingBlobDownloadUrl": training_blob_download_url,
                "baseModel": base_model,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        training_blob_download_url = d.pop("trainingBlobDownloadUrl")

        base_model = GetTrainingInfoResponse200BaseModel(d.pop("baseModel"))

        get_training_info_response_200 = cls(
            training_blob_download_url=training_blob_download_url,
            base_model=base_model,
        )

        return get_training_info_response_200
