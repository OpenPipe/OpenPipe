from enum import Enum


class GetTrainingInfoResponse200BaseModel(str, Enum):
    META_LLAMALLAMA_2_13B_HF = "meta-llama/Llama-2-13b-hf"
    META_LLAMALLAMA_2_7B_HF = "meta-llama/Llama-2-7b-hf"
    MISTRALAIMISTRAL_7B_V0_1 = "mistralai/Mistral-7B-v0.1"

    def __str__(self) -> str:
        return str(self.value)
