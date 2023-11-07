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
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2, Unset]):
        url (Union[Unset, str]):
    """

    detail: Union[
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2,
        Unset,
    ] = UNSET
    url: Union[Unset, str] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        detail: Union[Unset, str]
        if isinstance(self.detail, Unset):
            detail = UNSET

        elif isinstance(
            self.detail, CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0
        ):
            detail = UNSET
            if not isinstance(self.detail, Unset):
                detail = self.detail.value

        elif isinstance(
            self.detail, CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1
        ):
            detail = UNSET
            if not isinstance(self.detail, Unset):
                detail = self.detail.value

        else:
            detail = UNSET
            if not isinstance(self.detail, Unset):
                detail = self.detail.value

        url = self.url

        field_dict: Dict[str, Any] = {}
        field_dict.update({})
        if detail is not UNSET:
            field_dict["detail"] = detail
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
            Unset,
        ]:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _detail_type_0 = data
                detail_type_0: Union[
                    Unset,
                    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0,
                ]
                if isinstance(_detail_type_0, Unset):
                    detail_type_0 = UNSET
                else:
                    detail_type_0 = (
                        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType0(
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
                    Unset,
                    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1,
                ]
                if isinstance(_detail_type_1, Unset):
                    detail_type_1 = UNSET
                else:
                    detail_type_1 = (
                        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType1(
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
                Unset, CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2
            ]
            if isinstance(_detail_type_2, Unset):
                detail_type_2 = UNSET
            else:
                detail_type_2 = (
                    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrlDetailType2(
                        _detail_type_2
                    )
                )

            return detail_type_2

        detail = _parse_detail(d.pop("detail", UNSET))

        url = d.pop("url", UNSET)

        create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url = cls(
            detail=detail,
            url=url,
        )

        return create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url
