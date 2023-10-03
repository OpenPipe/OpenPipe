from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

from ..models.get_training_info_response_200_base_model import GetTrainingInfoResponse200BaseModel

T = TypeVar("T", bound="GetTrainingInfoResponse200")


@_attrs_define
class GetTrainingInfoResponse200:
    """
    Attributes:
        training_data_url (str):
        hugging_face_model_id (str):
        base_model (GetTrainingInfoResponse200BaseModel):
    """

    training_data_url: str
    hugging_face_model_id: str
    base_model: GetTrainingInfoResponse200BaseModel

    def to_dict(self) -> Dict[str, Any]:
        training_data_url = self.training_data_url
        hugging_face_model_id = self.hugging_face_model_id
        base_model = self.base_model.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "trainingDataUrl": training_data_url,
                "huggingFaceModelId": hugging_face_model_id,
                "baseModel": base_model,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        training_data_url = d.pop("trainingDataUrl")

        hugging_face_model_id = d.pop("huggingFaceModelId")

        base_model = GetTrainingInfoResponse200BaseModel(d.pop("baseModel"))

        get_training_info_response_200 = cls(
            training_data_url=training_data_url,
            hugging_face_model_id=hugging_face_model_id,
            base_model=base_model,
        )

        return get_training_info_response_200
