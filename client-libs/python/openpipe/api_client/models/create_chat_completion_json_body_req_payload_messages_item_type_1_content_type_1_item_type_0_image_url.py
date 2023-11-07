from typing import Any, Dict, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url_detail_type_0 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url_detail_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
)
from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url_detail_type_2 import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrl")


@define
class CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrl:
    """
    Attributes:
        detail (Union[CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2]):
        url (Union[Unset, str]):
    """

    detail: Union[
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2,
    ]
    url: Union[Unset, str] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        detail: str

        if isinstance(
            self.detail, CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0
        ):
            detail = self.detail.value

        elif isinstance(
            self.detail, CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1
        ):
            detail = self.detail.value

        else:
            detail = self.detail.value

        url = self.url

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "detail": detail,
            }
        )
        if url is not UNSET:
            field_dict["url"] = url

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        d = src_dict.copy()

        def _parse_detail(
            data: object,
        ) -> Union[
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2,
        ]:
            try:
                if not isinstance(data, str):
                    raise TypeError()
                detail_type_0 = (
                    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0(
                        data
                    )
                )

                return detail_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                detail_type_1 = (
                    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1(
                        data
                    )
                )

                return detail_type_1
            except:  # noqa: E722
                pass
            if not isinstance(data, str):
                raise TypeError()
            detail_type_2 = (
                CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2(data)
            )

            return detail_type_2

        detail = _parse_detail(d.pop("detail"))

        url = d.pop("url", UNSET)

        create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url = cls(
            detail=detail,
            url=url,
        )

        return create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url
