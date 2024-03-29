# This file was auto-generated by Fern from our API Definition.

from __future__ import annotations

import typing

import typing_extensions

from .unstable_dataset_entry_create_request_entries_item_messages_item_assistant import (
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemAssistant,
)
from .unstable_dataset_entry_create_request_entries_item_messages_item_function import (
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemFunction,
)
from .unstable_dataset_entry_create_request_entries_item_messages_item_system import (
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemSystem,
)
from .unstable_dataset_entry_create_request_entries_item_messages_item_tool import (
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemTool,
)
from .unstable_dataset_entry_create_request_entries_item_messages_item_user import (
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUser,
)


class UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_System(
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemSystem
):
    role: typing_extensions.Literal["system"]

    class Config:
        frozen = True
        smart_union = True
        allow_population_by_field_name = True


class UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_User(
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemUser
):
    role: typing_extensions.Literal["user"]

    class Config:
        frozen = True
        smart_union = True
        allow_population_by_field_name = True


class UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_Assistant(
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemAssistant
):
    role: typing_extensions.Literal["assistant"]

    class Config:
        frozen = True
        smart_union = True
        allow_population_by_field_name = True


class UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_Tool(
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemTool
):
    role: typing_extensions.Literal["tool"]

    class Config:
        frozen = True
        smart_union = True
        allow_population_by_field_name = True


class UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_Function(
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItemFunction
):
    role: typing_extensions.Literal["function"]

    class Config:
        frozen = True
        smart_union = True
        allow_population_by_field_name = True


UnstableDatasetEntryCreateRequestEntriesItemMessagesItem = typing.Union[
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_System,
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_User,
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_Assistant,
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_Tool,
    UnstableDatasetEntryCreateRequestEntriesItemMessagesItem_Function,
]
