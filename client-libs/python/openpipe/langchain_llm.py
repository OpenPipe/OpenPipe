import os
from typing import Dict

from langchain.chat_models.openai import ChatOpenAI as ChatOpenAIBase
from langchain.pydantic_v1 import BaseModel, Field, root_validator
from langchain.utils import get_from_dict_or_env
from langchain.utils.openai import is_openai_v1


class ChatOpenAI(ChatOpenAIBase):
    openpipe_kwargs: Dict[str, str] = Field(
        default_factory=lambda: {"verify_ssl": False}
    )

    @root_validator()
    def validate_environment(cls, values: Dict) -> Dict:
        """Validate that api key and python package exists in environment."""
        if values["n"] < 1:
            raise ValueError("n must be at least 1.")
        if values["n"] > 1 and values["streaming"]:
            raise ValueError("n must be 1 when streaming.")

        values["openai_api_key"] = get_from_dict_or_env(
            values, "openai_api_key", "OPENAI_API_KEY"
        )
        # Check OPENAI_ORGANIZATION for backwards compatibility.
        values["openai_organization"] = (
            values["openai_organization"]
            or os.getenv("OPENAI_ORG_ID")
            or os.getenv("OPENAI_ORGANIZATION")
        )
        values["openai_api_base"] = values["openai_api_base"] or os.getenv(
            "OPENAI_API_BASE"
        )
        values["openai_proxy"] = get_from_dict_or_env(
            values,
            "openai_proxy",
            "OPENAI_PROXY",
            default="",
        )
        try:
            import openai
            from . import OpenAI
            from .openai_sync_wrapper import OpenAIWrapper as OpenAI
            from .openai_async_wrapper import AsyncOpenAIWrapper as AsyncOpenAI

        except ImportError:
            raise ImportError(
                "Could not import openai python package. "
                "Please install it with `pip install openai`."
            )

        if is_openai_v1():
            client_params = {
                "api_key": values["openai_api_key"],
                "organization": values["openai_organization"],
                "base_url": values["openai_api_base"],
                "timeout": values["request_timeout"],
                "max_retries": values["max_retries"],
                "default_headers": values["default_headers"],
                "default_query": values["default_query"],
                "http_client": values["http_client"],
                "openpipe": values["openpipe_kwargs"],
            }
            values["client"] = OpenAI(**client_params).chat.completions
            values["async_client"] = AsyncOpenAI(**client_params).chat.completions
        else:
            values["client"] = openai.ChatCompletion
        return values

    def with_tags(self, **kwargs) -> "ChatOpenAI":
        model_kwargs = self.model_kwargs
        if "openpipe" not in model_kwargs:
            model_kwargs["openpipe"] = {"tags": {}}
        openpipe = model_kwargs["openpipe"]

        if "tags" not in openpipe:
            openpipe = {"tags": {}}
        tags = openpipe["tags"]

        for k, v in kwargs.items():
            tags[k] = v

        return self
