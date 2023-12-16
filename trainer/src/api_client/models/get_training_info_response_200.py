from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="GetTrainingInfoResponse200")


@_attrs_define
class GetTrainingInfoResponse200:
    """
    Attributes:
        training_data_url (str):
        hugging_face_model_id (str):
        base_model (str):
        project_name (str):
        model_slug (str):
    """

    training_data_url: str
    hugging_face_model_id: str
    base_model: str
    project_name: str
    model_slug: str

    def to_dict(self) -> Dict[str, Any]:
        training_data_url = self.training_data_url
        hugging_face_model_id = self.hugging_face_model_id
        base_model = self.base_model
        project_name = self.project_name
        model_slug = self.model_slug

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "trainingDataUrl": training_data_url,
                "huggingFaceModelId": hugging_face_model_id,
                "baseModel": base_model,
                "projectName": project_name,
                "modelSlug": model_slug,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        training_data_url = d.pop("trainingDataUrl")

        hugging_face_model_id = d.pop("huggingFaceModelId")

        base_model = d.pop("baseModel")

        project_name = d.pop("projectName")

        model_slug = d.pop("modelSlug")

        get_training_info_response_200 = cls(
            training_data_url=training_data_url,
            hugging_face_model_id=hugging_face_model_id,
            base_model=base_model,
            project_name=project_name,
            model_slug=model_slug,
        )

        return get_training_info_response_200
