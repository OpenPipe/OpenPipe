# This file was auto-generated by Fern from our API Definition.

import typing

import typing_extensions

from .create_chat_completion_request_req_payload_function_call_name import (
    CreateChatCompletionRequestReqPayloadFunctionCallName,
)

CreateChatCompletionRequestReqPayloadFunctionCall = typing.Union[
    typing_extensions.Literal["none"],
    typing_extensions.Literal["auto"],
    CreateChatCompletionRequestReqPayloadFunctionCallName,
]
