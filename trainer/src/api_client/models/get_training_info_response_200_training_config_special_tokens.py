from typing import Any, Dict, Type, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="GetTrainingInfoResponse200TrainingConfigSpecialTokens")


@_attrs_define
class GetTrainingInfoResponse200TrainingConfigSpecialTokens:
    """
    Attributes:
        bos_token (str):
        eos_token (str):
        unk_token (str):
    """

    bos_token: str
    eos_token: str
    unk_token: str

    def to_dict(self) -> Dict[str, Any]:
        bos_token = self.bos_token
        eos_token = self.eos_token
        unk_token = self.unk_token

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "bos_token": bos_token,
                "eos_token": eos_token,
                "unk_token": unk_token,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        bos_token = d.pop("bos_token")

        eos_token = d.pop("eos_token")

        unk_token = d.pop("unk_token")

        get_training_info_response_200_training_config_special_tokens = cls(
            bos_token=bos_token,
            eos_token=eos_token,
            unk_token=unk_token,
        )

        return get_training_info_response_200_training_config_special_tokens
