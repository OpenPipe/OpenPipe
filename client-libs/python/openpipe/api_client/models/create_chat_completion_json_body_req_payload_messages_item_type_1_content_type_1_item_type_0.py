from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_type import (
    CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0Type,
)

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrl,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0")


@define
class CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0:
    """
    Attributes:
        type (CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0Type):
        image_url (CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrl):
    """

    type: CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0Type
    image_url: "CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrl"

    def to_dict(self) -> Dict[str, Any]:
        type = self.type.value

        image_url = self.image_url.to_dict()

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "type": type,
                "image_url": image_url,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0_image_url import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrl,
        )

        d = src_dict.copy()
        type = CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0Type(d.pop("type"))

        image_url = CreateChatCompletionJsonBodyReqPayloadMessagesItemType1ContentType1ItemType0ImageUrl.from_dict(
            d.pop("image_url")
        )

        create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0 = cls(
            type=type,
            image_url=image_url,
        )

        return create_chat_completion_json_body_req_payload_messages_item_type_1_content_type_1_item_type_0
