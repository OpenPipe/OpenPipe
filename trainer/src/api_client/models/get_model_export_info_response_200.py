from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="GetModelExportInfoResponse200")


@_attrs_define
class GetModelExportInfoResponse200:
    """
    Attributes:
        base_model (str):
        fine_tune_id (str):
        s_3_bucket_name (str):
        s_3_key (str):
    """

    base_model: str
    fine_tune_id: str
    s_3_bucket_name: str
    s_3_key: str

    def to_dict(self) -> Dict[str, Any]:
        base_model = self.base_model
        fine_tune_id = self.fine_tune_id
        s_3_bucket_name = self.s_3_bucket_name
        s_3_key = self.s_3_key

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "baseModel": base_model,
                "fineTuneId": fine_tune_id,
                "s3BucketName": s_3_bucket_name,
                "s3Key": s_3_key,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        base_model = d.pop("baseModel")

        fine_tune_id = d.pop("fineTuneId")

        s_3_bucket_name = d.pop("s3BucketName")

        s_3_key = d.pop("s3Key")

        get_model_export_info_response_200 = cls(
            base_model=base_model,
            fine_tune_id=fine_tune_id,
            s_3_bucket_name=s_3_bucket_name,
            s_3_key=s_3_key,
        )

        return get_model_export_info_response_200
