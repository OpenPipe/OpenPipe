from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

from ..models.get_model_export_info_response_200_weights_format import GetModelExportInfoResponse200WeightsFormat

T = TypeVar("T", bound="GetModelExportInfoResponse200")


@_attrs_define
class GetModelExportInfoResponse200:
    """
    Attributes:
        base_model (str):
        fine_tune_id (str):
        s_3_bucket_name (str):
        s_3_key (str):
        weights_format (GetModelExportInfoResponse200WeightsFormat):
    """

    base_model: str
    fine_tune_id: str
    s_3_bucket_name: str
    s_3_key: str
    weights_format: GetModelExportInfoResponse200WeightsFormat

    def to_dict(self) -> Dict[str, Any]:
        base_model = self.base_model
        fine_tune_id = self.fine_tune_id
        s_3_bucket_name = self.s_3_bucket_name
        s_3_key = self.s_3_key
        weights_format = self.weights_format.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "baseModel": base_model,
                "fineTuneId": fine_tune_id,
                "s3BucketName": s_3_bucket_name,
                "s3Key": s_3_key,
                "weightsFormat": weights_format,
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

        weights_format = GetModelExportInfoResponse200WeightsFormat(d.pop("weightsFormat"))

        get_model_export_info_response_200 = cls(
            base_model=base_model,
            fine_tune_id=fine_tune_id,
            s_3_bucket_name=s_3_bucket_name,
            s_3_key=s_3_key,
            weights_format=weights_format,
        )

        return get_model_export_info_response_200
