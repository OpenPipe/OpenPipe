from typing import TYPE_CHECKING, Any, Dict, List, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_response_200_object import CreateChatCompletionResponse200Object
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_response_200_choices_item import CreateChatCompletionResponse200ChoicesItem
    from ..models.create_chat_completion_response_200_usage import CreateChatCompletionResponse200Usage


T = TypeVar("T", bound="CreateChatCompletionResponse200")


@define
class CreateChatCompletionResponse200:
    """
    Attributes:
        id (str):
        object_ (CreateChatCompletionResponse200Object):
        created (float):
        model (str):
        choices (List['CreateChatCompletionResponse200ChoicesItem']):
        usage (Union[Unset, CreateChatCompletionResponse200Usage]):
    """

    id: str
    object_: CreateChatCompletionResponse200Object
    created: float
    model: str
    choices: List["CreateChatCompletionResponse200ChoicesItem"]
    usage: Union[Unset, "CreateChatCompletionResponse200Usage"] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        id = self.id
        object_ = self.object_.value

        created = self.created
        model = self.model
        choices = []
        for choices_item_data in self.choices:
            choices_item = choices_item_data.to_dict()

            choices.append(choices_item)

        usage: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.usage, Unset):
            usage = self.usage.to_dict()

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "id": id,
                "object": object_,
                "created": created,
                "model": model,
                "choices": choices,
            }
        )
        if usage is not UNSET:
            field_dict["usage"] = usage

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_response_200_choices_item import CreateChatCompletionResponse200ChoicesItem
        from ..models.create_chat_completion_response_200_usage import CreateChatCompletionResponse200Usage

        d = src_dict.copy()
        id = d.pop("id")

        object_ = CreateChatCompletionResponse200Object(d.pop("object"))

        created = d.pop("created")

        model = d.pop("model")

        choices = []
        _choices = d.pop("choices")
        for choices_item_data in _choices:
            choices_item = CreateChatCompletionResponse200ChoicesItem.from_dict(choices_item_data)

            choices.append(choices_item)

        _usage = d.pop("usage", UNSET)
        usage: Union[Unset, CreateChatCompletionResponse200Usage]
        if isinstance(_usage, Unset):
            usage = UNSET
        else:
            usage = CreateChatCompletionResponse200Usage.from_dict(_usage)

        create_chat_completion_response_200 = cls(
            id=id,
            object_=object_,
            created=created,
            model=model,
            choices=choices,
            usage=usage,
        )

        return create_chat_completion_response_200
