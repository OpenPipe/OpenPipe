from typing import Any, Dict, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_0_image_url_detail_type_0 import (
    CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
)
from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_0_image_url_detail_type_1 import (
    CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
)
from ..models.create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_0_image_url_detail_type_2 import (
    CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType2,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrl")


@define
class CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrl:
    """
    Attributes:
        url (str):
        detail (Union[CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType2, Unset]):
    """

    url: str
    detail: Union[
        CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
        CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
        CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType2,
        Unset,
    ] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        url = self.url
        detail: Union[Unset, str]
        if isinstance(self.detail, Unset):
            detail = UNSET

        elif isinstance(
            self.detail, CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType0
        ):
            detail = UNSET
            if not isinstance(self.detail, Unset):
                detail = self.detail.value

        elif isinstance(
            self.detail, CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType1
        ):
            detail = UNSET
            if not isinstance(self.detail, Unset):
                detail = self.detail.value

        else:
            detail = UNSET
            if not isinstance(self.detail, Unset):
                detail = self.detail.value

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "url": url,
            }
        )
        if detail is not UNSET:
            field_dict["detail"] = detail

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()
        url = d.pop("url")

        def _parse_detail(
            data: object,
        ) -> Union[
            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
            CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType2,
            Unset,
        ]:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _detail_type_0 = data
                detail_type_0: Union[
                    Unset, CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType0
                ]
                if isinstance(_detail_type_0, Unset):
                    detail_type_0 = UNSET
                else:
                    detail_type_0 = (
                        CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType0(
                            _detail_type_0
                        )
                    )

                return detail_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _detail_type_1 = data
                detail_type_1: Union[
                    Unset, CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType1
                ]
                if isinstance(_detail_type_1, Unset):
                    detail_type_1 = UNSET
                else:
                    detail_type_1 = (
                        CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType1(
                            _detail_type_1
                        )
                    )

                return detail_type_1
            except:  # noqa: E722
                pass
            if not isinstance(data, str):
                raise TypeError()
            _detail_type_2 = data
            detail_type_2: Union[
                Unset, CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType2
            ]
            if isinstance(_detail_type_2, Unset):
                detail_type_2 = UNSET
            else:
                detail_type_2 = CreateChatCompletionJsonBodyMessagesItemType1ContentType1ItemType0ImageUrlDetailType2(
                    _detail_type_2
                )

            return detail_type_2

        detail = _parse_detail(d.pop("detail", UNSET))

        create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_0_image_url = cls(
            url=url,
            detail=detail,
        )

        return create_chat_completion_json_body_messages_item_type_1_content_type_1_item_type_0_image_url
