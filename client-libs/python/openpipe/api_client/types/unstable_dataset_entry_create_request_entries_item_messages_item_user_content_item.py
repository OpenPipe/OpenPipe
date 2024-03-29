# This file was auto-generated by Fern from our API Definition.

from __future__ import annotations

import typing

import typing_extensions

from .unstable_dataset_entry_create_request_entries_item_messages_item_user_content_item_image_url import (
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItemImageUrl,
)
from .unstable_dataset_entry_create_request_entries_item_messages_item_user_content_item_text import (
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItemText,
)


class UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItem_ImageUrl(
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItemImageUrl
):
    type: typing_extensions.Literal["image_url"]

    class Config:
        frozen = True
        smart_union = True
        allow_population_by_field_name = True


class UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItem_Text(
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItemText
):
    type: typing_extensions.Literal["text"]

    class Config:
        frozen = True
        smart_union = True
        allow_population_by_field_name = True


UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItem = typing.Union[
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItem_ImageUrl,
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUserContentItem_Text,
]
