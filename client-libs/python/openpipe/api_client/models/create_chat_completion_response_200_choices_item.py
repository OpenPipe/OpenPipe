from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_response_200_choices_item_finish_reason_type_0 import (
    CreateChatCompletionResponse200ChoicesItemFinishReasonType0,
)
from ..models.create_chat_completion_response_200_choices_item_finish_reason_type_1 import (
    CreateChatCompletionResponse200ChoicesItemFinishReasonType1,
)
from ..models.create_chat_completion_response_200_choices_item_finish_reason_type_2 import (
    CreateChatCompletionResponse200ChoicesItemFinishReasonType2,
)
from ..models.create_chat_completion_response_200_choices_item_finish_reason_type_3 import (
    CreateChatCompletionResponse200ChoicesItemFinishReasonType3,
)
from ..models.create_chat_completion_response_200_choices_item_finish_reason_type_4 import (
    CreateChatCompletionResponse200ChoicesItemFinishReasonType4,
)

if TYPE_CHECKING:
    from ..models.create_chat_completion_response_200_choices_item_message import (
        CreateChatCompletionResponse200ChoicesItemMessage,
    )


T = TypeVar("T", bound="CreateChatCompletionResponse200ChoicesItem")


@define
class CreateChatCompletionResponse200ChoicesItem:
    """
    Attributes:
        finish_reason (Union[CreateChatCompletionResponse200ChoicesItemFinishReasonType0,
            CreateChatCompletionResponse200ChoicesItemFinishReasonType1,
            CreateChatCompletionResponse200ChoicesItemFinishReasonType2,
            CreateChatCompletionResponse200ChoicesItemFinishReasonType3,
            CreateChatCompletionResponse200ChoicesItemFinishReasonType4]):
        index (float):
        message (CreateChatCompletionResponse200ChoicesItemMessage):
    """

    finish_reason: Union[
        CreateChatCompletionResponse200ChoicesItemFinishReasonType0,
        CreateChatCompletionResponse200ChoicesItemFinishReasonType1,
        CreateChatCompletionResponse200ChoicesItemFinishReasonType2,
        CreateChatCompletionResponse200ChoicesItemFinishReasonType3,
        CreateChatCompletionResponse200ChoicesItemFinishReasonType4,
    ]
    index: float
    message: "CreateChatCompletionResponse200ChoicesItemMessage"

    def to_dict(self) -> Dict[str, Any]:
        finish_reason: str

        if isinstance(self.finish_reason, CreateChatCompletionResponse200ChoicesItemFinishReasonType0):
            finish_reason = self.finish_reason.value

        elif isinstance(self.finish_reason, CreateChatCompletionResponse200ChoicesItemFinishReasonType1):
            finish_reason = self.finish_reason.value

        elif isinstance(self.finish_reason, CreateChatCompletionResponse200ChoicesItemFinishReasonType2):
            finish_reason = self.finish_reason.value

        elif isinstance(self.finish_reason, CreateChatCompletionResponse200ChoicesItemFinishReasonType3):
            finish_reason = self.finish_reason.value

        else:
            finish_reason = self.finish_reason.value

        index = self.index
        message = self.message.to_dict()

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "finish_reason": finish_reason,
                "index": index,
                "message": message,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_response_200_choices_item_message import (
            CreateChatCompletionResponse200ChoicesItemMessage,
        )

        d = src_dict.copy()

        def _parse_finish_reason(
            data: object,
        ) -> Union[
            CreateChatCompletionResponse200ChoicesItemFinishReasonType0,
            CreateChatCompletionResponse200ChoicesItemFinishReasonType1,
            CreateChatCompletionResponse200ChoicesItemFinishReasonType2,
            CreateChatCompletionResponse200ChoicesItemFinishReasonType3,
            CreateChatCompletionResponse200ChoicesItemFinishReasonType4,
        ]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                finish_reason_type_0 = CreateChatCompletionResponse200ChoicesItemFinishReasonType0(data)

                return finish_reason_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                finish_reason_type_1 = CreateChatCompletionResponse200ChoicesItemFinishReasonType1(data)

                return finish_reason_type_1
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                finish_reason_type_2 = CreateChatCompletionResponse200ChoicesItemFinishReasonType2(data)

                return finish_reason_type_2
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                finish_reason_type_3 = CreateChatCompletionResponse200ChoicesItemFinishReasonType3(data)

                return finish_reason_type_3
            except:  # noqa: E722
                pass
            if not isinstance(data, str):
                raise TypeError()
            finish_reason_type_4 = CreateChatCompletionResponse200ChoicesItemFinishReasonType4(data)

            return finish_reason_type_4

        finish_reason = _parse_finish_reason(d.pop("finish_reason"))

        index = d.pop("index")

        message = CreateChatCompletionResponse200ChoicesItemMessage.from_dict(d.pop("message"))

        create_chat_completion_response_200_choices_item = cls(
            finish_reason=finish_reason,
            index=index,
            message=message,
        )

        return create_chat_completion_response_200_choices_item
