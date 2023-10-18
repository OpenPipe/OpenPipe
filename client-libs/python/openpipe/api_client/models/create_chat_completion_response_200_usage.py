from typing import Any, Dict, Type, TypeVar

from attrs import define

T = TypeVar("T", bound="CreateChatCompletionResponse200Usage")


@define
class CreateChatCompletionResponse200Usage:
    """
    Attributes:
        prompt_tokens (float):
        completion_tokens (float):
        total_tokens (float):
    """

    prompt_tokens: float
    completion_tokens: float
    total_tokens: float

    def to_dict(self) -> Dict[str, Any]:
        prompt_tokens = self.prompt_tokens
        completion_tokens = self.completion_tokens
        total_tokens = self.total_tokens

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        prompt_tokens = d.pop("prompt_tokens")

        completion_tokens = d.pop("completion_tokens")

        total_tokens = d.pop("total_tokens")

        create_chat_completion_response_200_usage = cls(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )

        return create_chat_completion_response_200_usage
