from enum import Enum


class GetTrainingInfoResponse200BaseModel(str, Enum):
    GPT_3_5_TURBO = "GPT_3_5_TURBO"
    LLAMA2_13B = "LLAMA2_13b"
    LLAMA2_70B = "LLAMA2_70b"
    LLAMA2_7B = "LLAMA2_7b"

    def __str__(self) -> str:
        return str(self.value)
