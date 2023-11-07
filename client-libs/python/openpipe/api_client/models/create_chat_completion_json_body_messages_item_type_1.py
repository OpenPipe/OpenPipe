from typing import TYPE_CHECKING, Any, Dict, List, Optional, Type, TypeVar, Union, cast

from attrs import define

from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_2 import (
    CreateChatCompletionJsonBodyMessagesItemType1ContentType2,
)
from ..models.create_chat_completion_json_body_messages_item_type_1_role import (
    CreateChatCompletionJsonBodyMessagesItemType1Role,
)
from ..types import UNSET

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_0 import (
        CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0,
    )
    from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_1 import (
        CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyMessagesItemType1")


@define
class CreateChatCompletionJsonBodyMessagesItemType1:
    """
    Attributes:
        role (CreateChatCompletionJsonBodyMessagesItemType1Role):
        content (Union[CreateChatCompletionJsonBodyMessagesItemType1ContentType2,
            List[Union['CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0',
            'CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1']], str]):
    """

    role: CreateChatCompletionJsonBodyMessagesItemType1Role
    content: Union[
        CreateChatCompletionJsonBodyMessagesItemType1ContentType2,
        List[
            Union[
                "CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0",
                "CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1",
            ]
        ],
        str,
    ]

    def to_dict(self) -> Dict[str, Any]:
        from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_0 import (
            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0,
        )

        role = self.role.value

        content: Union[List[Dict[str, Any]], str]

        if isinstance(self.content, list):
            content = []
            for content_type_1_item_data in self.content:
                content_type_1_item: Dict[str, Any]

                if isinstance(
                    content_type_1_item_data, CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0
                ):
                    content_type_1_item = content_type_1_item_data.to_dict()

                else:
                    content_type_1_item = content_type_1_item_data.to_dict()

                content.append(content_type_1_item)

        elif isinstance(self.content, CreateChatCompletionJsonBodyMessagesItemType1ContentType2):
            content = self.content.value if self.content else None

        else:
            content = self.content

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "role": role,
                "content": content,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_0 import (
            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0,
        )
        from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_1 import (
            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1,
        )

        d = src_dict.copy()
        role = CreateChatCompletionJsonBodyMessagesItemType1Role(d.pop("role"))

        def _parse_content(
            data: object,
        ) -> Union[
            CreateChatCompletionJsonBodyMessagesItemType1ContentType2,
            List[
                Union[
                    "CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0",
                    "CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1",
                ]
            ],
            str,
        ]:
            try:
                if not isinstance(data, list):
                    raise TypeError()
                content_type_1 = UNSET
                _content_type_1 = data
                for content_type_1_item_data in _content_type_1:

                    def _parse_content_type_1_item(
                        data: object,
                    ) -> Union[
                        "CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0",
                        "CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1",
                    ]:
                        try:
                            if not isinstance(data, dict):
                                raise TypeError()
                            content_type_1_item_type_0 = (
                                CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0.from_dict(data)
                            )

                            return content_type_1_item_type_0
                        except:  # noqa: E722
                            pass
                        if not isinstance(data, dict):
                            raise TypeError()
                        content_type_1_item_type_1 = (
                            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1.from_dict(data)
                        )

                        return content_type_1_item_type_1

                    content_type_1_item = _parse_content_type_1_item(content_type_1_item_data)

                    content_type_1.append(content_type_1_item)

                return content_type_1
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _content_type_2 = data
                content_type_2: Optional[CreateChatCompletionJsonBodyMessagesItemType1ContentType2]
                if _content_type_2 is None:
                    content_type_2 = UNSET
                else:
                    content_type_2 = CreateChatCompletionJsonBodyMessagesItemType1ContentType2(_content_type_2)

                return content_type_2
            except:  # noqa: E722
                pass
            return cast(
                Union[
                    CreateChatCompletionJsonBodyMessagesItemType1ContentType2,
                    List[
                        Union[
                            "CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0",
                            "CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType1",
                        ]
                    ],
                    str,
                ],
                data,
            )

        content = _parse_content(d.pop("content"))

        create_chat_completion_json_body_messages_item_type_1 = cls(
            role=role,
            content=content,
        )

        return create_chat_completion_json_body_messages_item_type_1
