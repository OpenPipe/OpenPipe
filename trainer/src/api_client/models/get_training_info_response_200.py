from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar, Union

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_training_info_response_200_training_config import GetTrainingInfoResponse200TrainingConfig


T = TypeVar("T", bound="GetTrainingInfoResponse200")


@_attrs_define
class GetTrainingInfoResponse200:
    """
    Attributes:
        training_data_url (str):
        hugging_face_model_id (str):
        training_config (GetTrainingInfoResponse200TrainingConfig):
        fireworks_base_model (Union[Unset, str]):
    """

    training_data_url: str
    hugging_face_model_id: str
    training_config: "GetTrainingInfoResponse200TrainingConfig"
    fireworks_base_model: Union[Unset, str] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        training_data_url = self.training_data_url
        hugging_face_model_id = self.hugging_face_model_id
        training_config = self.training_config.to_dict()

        fireworks_base_model = self.fireworks_base_model

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "trainingDataUrl": training_data_url,
                "huggingFaceModelId": hugging_face_model_id,
                "trainingConfig": training_config,
            }
        )
        if fireworks_base_model is not UNSET:
            field_dict["fireworksBaseModel"] = fireworks_base_model

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.get_training_info_response_200_training_config import GetTrainingInfoResponse200TrainingConfig

        d = src_dict.copy()
        training_data_url = d.pop("trainingDataUrl")

        hugging_face_model_id = d.pop("huggingFaceModelId")

        training_config = GetTrainingInfoResponse200TrainingConfig.from_dict(d.pop("trainingConfig"))

        fireworks_base_model = d.pop("fireworksBaseModel", UNSET)

        get_training_info_response_200 = cls(
            training_data_url=training_data_url,
            hugging_face_model_id=hugging_face_model_id,
            training_config=training_config,
            fireworks_base_model=fireworks_base_model,
        )

        return get_training_info_response_200
