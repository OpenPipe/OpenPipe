from openai import OpenAI as OriginalOpenAI, OpenAIError, Timeout
from openai.resources import Chat
from openai.resources.chat.completions import Completions
from openai._types import NotGiven, NOT_GIVEN
from openai.types.chat import ChatCompletion, ChatCompletionChunk
from openai._streaming import Stream
from openai._base_client import DEFAULT_MAX_RETRIES

import time
import json
from typing import Union, Mapping, Optional, Dict
import httpx

from .merge_openai_chunks import merge_openai_chunks
from .shared import (
    report,
    get_chat_completion_json,
    configure_openpipe_client,
)

from .api_client.client import OpenPipeApi
from .api_client.core.api_error import ApiError


class CompletionsWrapper(Completions):
    openpipe_client: OpenPipeApi

    def __init__(self, client: OriginalOpenAI, openpipe_client: OpenPipeApi) -> None:
        super().__init__(client)
        self.openpipe_client = openpipe_client

    def create(
        self, *args, **kwargs
    ) -> Union[ChatCompletion, Stream[ChatCompletionChunk]]:
        openpipe_options = kwargs.pop("openpipe", {})

        requested_at = int(time.time() * 1000)
        model = kwargs.get("model", "")

        try:
            if model.startswith("openpipe:"):
                response = self.openpipe_client.create_chat_completion(
                    **kwargs,
                )
                chat_completion = ChatCompletion(**json.loads(response.json()))
            else:
                chat_completion = super().create(*args, **kwargs)

            if isinstance(chat_completion, Stream):

                def _gen():
                    assembled_completion = None
                    for chunk in chat_completion:
                        assembled_completion = merge_openai_chunks(
                            assembled_completion, chunk
                        )

                        yield chunk

                    received_at = int(time.time() * 1000)

                    report(
                        configured_client=self.openpipe_client,
                        openpipe_options=openpipe_options,
                        requested_at=requested_at,
                        received_at=received_at,
                        req_payload=kwargs,
                        resp_payload=get_chat_completion_json(assembled_completion),
                        status_code=200,
                    )

                return _gen()
            else:
                received_at = int(time.time() * 1000)

                report(
                    configured_client=self.openpipe_client,
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
                report(
                    configured_client=self.openpipe_client,
                    openpipe_options=openpipe_options,
                    requested_at=requested_at,
                    received_at=received_at,
                    req_payload=kwargs,
                    resp_payload=e.response.json(),
                    error_message=e.response.json()["error"]["message"],
                    status_code=e.__dict__["status_code"],
                )
            elif isinstance(e, ApiError):
                error_content = None
                error_message = ""
                try:
                    error_content = e.body
                    if isinstance(e.body, str):
                        error_message = error_content
                    else:
                        error_message = error_content["message"]
                except:
                    pass

                report(
                    configured_client=self.openpipe_client,
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


class ChatWrapper(Chat):
    def __init__(self, client: OriginalOpenAI, openpipe_client: OpenPipeApi) -> None:
        super().__init__(client)
        self.completions = CompletionsWrapper(client, openpipe_client)


class OpenAIWrapper(OriginalOpenAI):
    chat: ChatWrapper
    openpipe_client: OpenPipeApi

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

        self.openpipe_client = OpenPipeApi(token="")
        configure_openpipe_client(self.openpipe_client, openpipe)

        self.chat = ChatWrapper(self, self.openpipe_client)
