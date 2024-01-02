from enum import Enum


class GetTrainingInfoResponse200TrainingConfigModelType(str, Enum):
    LLAMAFORCAUSALLM = "LlamaForCausalLM"
    MISTRALFORCAUSALLM = "MistralForCausalLM"

    def __str__(self) -> str:
        return str(self.value)
