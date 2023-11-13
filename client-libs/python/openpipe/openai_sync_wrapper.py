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
from .api_client.api.default import create_chat_completion
from .api_client import errors
from .shared import report, configured_client, get_chat_completion_json


class WrappedCompletions(Completions):
    def __init__(self, client: OriginalOpenAI) -> None:
        super().__init__(client)

    def create(cls, *args, **kwargs) -> ChatCompletion | Stream[ChatCompletionChunk]:
        openpipe_options = kwargs.pop("openpipe", {})

        requested_at = int(time.time() * 1000)
        model = kwargs.get("model", "")

        try:
            if model.startswith("openpipe:"):
                response = create_chat_completion.sync_detailed(
                    client=configured_client,
                    json_body=create_chat_completion.CreateChatCompletionJsonBody.from_dict(
                        kwargs,
                    ),
                )
                chat_completion = ChatCompletion(**json.loads(response.content))
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

                report(
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


class WrappedChat(Chat):
    def __init__(self, client: OriginalOpenAI) -> None:
        super().__init__(client)
        self.completions = WrappedCompletions(client)


class WrappedOpenAI(OriginalOpenAI):
    chat: WrappedChat

    # Support auto-complete
    def __init__(
        self,
        *,
        openpipe: Optional[Dict[str, str]] = None,
        api_key: str | None = None,
        organization: str | None = None,
        base_url: str | httpx.URL | None = None,
        timeout: Union[float, Timeout, None, NotGiven] = NOT_GIVEN,
        max_retries: int = DEFAULT_MAX_RETRIES,
        default_headers: Mapping[str, str] | None = None,
        default_query: Mapping[str, object] | None = None,
        http_client: httpx.Client | None = None,
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

        if openpipe:
            if "api_key" in openpipe:
                self.token = openpipe["api_key"]
            if "base_url" in openpipe:
                self._base_url = openpipe["base_url"]

        self.chat = WrappedChat(self)
