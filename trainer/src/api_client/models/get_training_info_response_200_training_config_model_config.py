from typing import Any, Dict, Type, TypeVar, Union

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetTrainingInfoResponse200TrainingConfigModelConfig")


@_attrs_define
class GetTrainingInfoResponse200TrainingConfigModelConfig:
    """
    Attributes:
        output_router_logits (Union[Unset, bool]):
    """

    output_router_logits: Union[Unset, bool] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        output_router_logits = self.output_router_logits

        field_dict: Dict[str, Any] = {}
        field_dict.update({})
        if output_router_logits is not UNSET:
            field_dict["output_router_logits"] = output_router_logits

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        output_router_logits = d.pop("output_router_logits", UNSET)

        get_training_info_response_200_training_config_model_config = cls(
            output_router_logits=output_router_logits,
        )

        return get_training_info_response_200_training_config_model_config
