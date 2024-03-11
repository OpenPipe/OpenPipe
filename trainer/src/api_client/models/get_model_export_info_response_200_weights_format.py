from enum import Enum


class GetModelExportInfoResponse200WeightsFormat(str, Enum):
    BF16 = "bf16"
    FP16 = "fp16"
    FP32 = "fp32"

    def __str__(self) -> str:
        return str(self.value)
