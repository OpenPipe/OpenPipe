from openai import AsyncOpenAI as OriginalAsyncOpenAI, OpenAIError, Timeout
from openai.resources import AsyncChat
from openai.resources.chat.completions import AsyncCompletions
from openai._types import NotGiven, NOT_GIVEN
from openai.types.chat import ChatCompletion, ChatCompletionChunk
from openai._streaming import AsyncStream
from openai._base_client import DEFAULT_MAX_RETRIES

import time
import json
from typing import Union, Mapping, Optional, Dict
import httpx

from .api_client.client import AuthenticatedClient
from .merge_openai_chunks import merge_openai_chunks
from .api_client.api.default import create_chat_completion
from .api_client import errors
from .shared import (
    report_async,
    configure_openpipe_client,
    get_chat_completion_json,
)


class AsyncCompletionsWrapper(AsyncCompletions):
    openpipe_client: AuthenticatedClient

    def __init__(
        self, client: OriginalAsyncOpenAI, openpipe_client: AuthenticatedClient
    ) -> None:
        super().__init__(client)
        self.openpipe_client = openpipe_client

    async def create(
        cls, *args, **kwargs
    ) -> Union[ChatCompletion, AsyncStream[ChatCompletionChunk]]:
        openpipe_options = kwargs.pop("openpipe", {})

        requested_at = int(time.time() * 1000)
        model = kwargs.get("model", "")

        try:
            if model.startswith("openpipe:"):
                response = await create_chat_completion.asyncio_detailed(
                    client=cls.openpipe_client,
                    json_body=create_chat_completion.CreateChatCompletionJsonBody.from_dict(
                        kwargs,
                    ),
                )
                chat_completion = ChatCompletion(**json.loads(response.content))
            else:
                chat_completion = await super().create(*args, **kwargs)

            if isinstance(chat_completion, AsyncStream):

                async def _gen():
                    assembled_completion = None
                    try:
                        async for chunk in chat_completion:
                            assembled_completion = merge_openai_chunks(
                                assembled_completion, chunk
                            )
                            yield chunk
                    finally:
                        try:
                            # This block will always execute when the generator exits.
                            # This ensures that cleanup and reporting operations are performed regardless of how the generator terminates.
                            received_at = int(time.time() * 1000)
                            await report_async(
                                configured_client=cls.openpipe_client,
                                openpipe_options=openpipe_options,
                                requested_at=requested_at,
                                received_at=received_at,
                                req_payload=kwargs,
                                resp_payload=get_chat_completion_json(
                                    assembled_completion
                                ),
                                status_code=200,
                            )
                        except Exception as e:
                            # Ignore any errors that occur while reporting
                            pass

                return _gen()
            else:
                received_at = int(time.time() * 1000)

                await report_async(
                    configured_client=cls.openpipe_client,
                    openpipe_options=openpipe_options,
                    requested_at=requested_at,
                    received_at=received_at,
                    req_payload=kwargs,
                    resp_payload=get_chat_completion_json(chat_completion),
                    status_code=200,
                )
            return chat_completion
        except Exception as e:
            received_at = int(time.time() * 1000)

            if isinstance(e, OpenAIError):
                await report_async(
                    configured_client=cls.openpipe_client,
                    openpipe_options=openpipe_options,
                    requested_at=requested_at,
                    received_at=received_at,
                    req_payload=kwargs,
                    resp_payload=e.response.json(),
                    error_message=e.response.json()["error"]["message"],
                    status_code=e.__dict__["status_code"],
                )
            elif isinstance(e, errors.UnexpectedStatus):
                error_content = None
                error_message = ""
                try:
                    error_content = json.loads(e.content)
                    error_message = error_content.get("message", "")
                except:
                    pass

                await report_async(
                    configured_client=cls.openpipe_client,
                    openpipe_options=openpipe_options,
                    requested_at=requested_at,
                    received_at=received_at,
                    req_payload=kwargs,
                    resp_payload=error_content,
                    error_message=error_message,
                    status_code=e.status_code,
                )
                raise Exception(error_message)

            raise e


class AsyncChatWrapper(AsyncChat):
    def __init__(
        self, client: OriginalAsyncOpenAI, openpipe_client: AuthenticatedClient
    ) -> None:
        super().__init__(client)
        self.completions = AsyncCompletionsWrapper(client, openpipe_client)


class AsyncOpenAIWrapper(OriginalAsyncOpenAI):
    chat: AsyncChatWrapper
    openpipe_client: AuthenticatedClient

    # Support auto-complete
    def __init__(
        self,
        *,
        openpipe: Optional[Dict[str, str]] = None,
        api_key: Union[str, None] = None,
        organization: Union[str, None] = None,
        base_url: Union[str, httpx.URL, None] = None,
        timeout: Union[float, Timeout, None, NotGiven] = NOT_GIVEN,
        max_retries: int = DEFAULT_MAX_RETRIES,
        default_headers: Union[Mapping[str, str], None] = None,
        default_query: Union[Mapping[str, object], None] = None,
        http_client: Union[httpx.Client, None] = None,
        _strict_response_validation: bool = False,
    ) -> None:
        super().__init__(
            api_key=api_key,
            organization=organization,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            default_headers=default_headers,
            default_query=default_query,
            http_client=http_client,
            _strict_response_validation=_strict_response_validation,
        )

        self.openpipe_client = configure_openpipe_client(openpipe)

        self.chat = AsyncChatWrapper(self, self.openpipe_client)
