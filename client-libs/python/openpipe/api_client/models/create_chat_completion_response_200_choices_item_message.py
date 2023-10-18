from typing import TYPE_CHECKING, Any, Dict, Optional, Type, TypeVar, Union, cast

from attrs import define

from ..models.create_chat_completion_response_200_choices_item_message_content_type_1 import (
    CreateChatCompletionResponse200ChoicesItemMessageContentType1,
)
from ..models.create_chat_completion_response_200_choices_item_message_role_type_0 import (
    CreateChatCompletionResponse200ChoicesItemMessageRoleType0,
)
from ..models.create_chat_completion_response_200_choices_item_message_role_type_1 import (
    CreateChatCompletionResponse200ChoicesItemMessageRoleType1,
)
from ..models.create_chat_completion_response_200_choices_item_message_role_type_2 import (
    CreateChatCompletionResponse200ChoicesItemMessageRoleType2,
)
from ..models.create_chat_completion_response_200_choices_item_message_role_type_3 import (
    CreateChatCompletionResponse200ChoicesItemMessageRoleType3,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_response_200_choices_item_message_function_call import (
        CreateChatCompletionResponse200ChoicesItemMessageFunctionCall,
    )


T = TypeVar("T", bound="CreateChatCompletionResponse200ChoicesItemMessage")


@define
class CreateChatCompletionResponse200ChoicesItemMessage:
    """
    Attributes:
        role (Union[CreateChatCompletionResponse200ChoicesItemMessageRoleType0,
            CreateChatCompletionResponse200ChoicesItemMessageRoleType1,
            CreateChatCompletionResponse200ChoicesItemMessageRoleType2,
            CreateChatCompletionResponse200ChoicesItemMessageRoleType3]):
        content (Union[CreateChatCompletionResponse200ChoicesItemMessageContentType1, str]):
        function_call (Union[Unset, CreateChatCompletionResponse200ChoicesItemMessageFunctionCall]):
    """

    role: Union[
        CreateChatCompletionResponse200ChoicesItemMessageRoleType0,
        CreateChatCompletionResponse200ChoicesItemMessageRoleType1,
        CreateChatCompletionResponse200ChoicesItemMessageRoleType2,
        CreateChatCompletionResponse200ChoicesItemMessageRoleType3,
    ]
    content: Union[CreateChatCompletionResponse200ChoicesItemMessageContentType1, str]
    function_call: Union[Unset, "CreateChatCompletionResponse200ChoicesItemMessageFunctionCall"] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        role: str

        if isinstance(self.role, CreateChatCompletionResponse200ChoicesItemMessageRoleType0):
            role = self.role.value

        elif isinstance(self.role, CreateChatCompletionResponse200ChoicesItemMessageRoleType1):
            role = self.role.value

        elif isinstance(self.role, CreateChatCompletionResponse200ChoicesItemMessageRoleType2):
            role = self.role.value

        else:
            role = self.role.value

        content: str

        if isinstance(self.content, CreateChatCompletionResponse200ChoicesItemMessageContentType1):
            content = self.content.value if self.content else None

        else:
            content = self.content

        function_call: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.function_call, Unset):
            function_call = self.function_call.to_dict()

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "role": role,
                "content": content,
            }
        )
        if function_call is not UNSET:
            field_dict["function_call"] = function_call

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_response_200_choices_item_message_function_call import (
            CreateChatCompletionResponse200ChoicesItemMessageFunctionCall,
        )

        d = src_dict.copy()

        def _parse_role(
            data: object,
        ) -> Union[
            CreateChatCompletionResponse200ChoicesItemMessageRoleType0,
            CreateChatCompletionResponse200ChoicesItemMessageRoleType1,
            CreateChatCompletionResponse200ChoicesItemMessageRoleType2,
            CreateChatCompletionResponse200ChoicesItemMessageRoleType3,
        ]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                role_type_0 = CreateChatCompletionResponse200ChoicesItemMessageRoleType0(data)

                return role_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                role_type_1 = CreateChatCompletionResponse200ChoicesItemMessageRoleType1(data)

                return role_type_1
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                role_type_2 = CreateChatCompletionResponse200ChoicesItemMessageRoleType2(data)

                return role_type_2
            except:  # noqa: E722
                pass
            if not isinstance(data, str):
                raise TypeError()
            role_type_3 = CreateChatCompletionResponse200ChoicesItemMessageRoleType3(data)

            return role_type_3

        role = _parse_role(d.pop("role"))

        def _parse_content(data: object) -> Union[CreateChatCompletionResponse200ChoicesItemMessageContentType1, str]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _content_type_1 = data
                content_type_1: Optional[CreateChatCompletionResponse200ChoicesItemMessageContentType1]
                if _content_type_1 is None:
                    content_type_1 = UNSET
                else:
                    content_type_1 = CreateChatCompletionResponse200ChoicesItemMessageContentType1(_content_type_1)

                return content_type_1
            except:  # noqa: E722
                pass
            return cast(Union[CreateChatCompletionResponse200ChoicesItemMessageContentType1, str], data)

        content = _parse_content(d.pop("content"))

        _function_call = d.pop("function_call", UNSET)
        function_call: Union[Unset, CreateChatCompletionResponse200ChoicesItemMessageFunctionCall]
        if isinstance(_function_call, Unset):
            function_call = UNSET
        else:
            function_call = CreateChatCompletionResponse200ChoicesItemMessageFunctionCall.from_dict(_function_call)

        create_chat_completion_response_200_choices_item_message = cls(
            role=role,
            content=content,
            function_call=function_call,
        )

        return create_chat_completion_response_200_choices_item_message
