from typing import TYPE_CHECKING, Any, Dict, List, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_function_call_type_0 import (
    CreateChatCompletionJsonBodyReqPayloadFunctionCallType0,
)
from ..models.create_chat_completion_json_body_req_payload_function_call_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadFunctionCallType1,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_function_call_type_2 import (
        CreateChatCompletionJsonBodyReqPayloadFunctionCallType2,
    )
    from ..models.create_chat_completion_json_body_req_payload_functions_item import (
        CreateChatCompletionJsonBodyReqPayloadFunctionsItem,
    )
    from ..models.create_chat_completion_json_body_req_payload_messages_item import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItem,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayload")


@define
class CreateChatCompletionJsonBodyReqPayload:
    """DEPRECATED. Use the top-level fields instead

    Attributes:
        model (str):
        messages (List['CreateChatCompletionJsonBodyReqPayloadMessagesItem']):
        function_call (Union['CreateChatCompletionJsonBodyReqPayloadFunctionCallType2',
            CreateChatCompletionJsonBodyReqPayloadFunctionCallType0,
            CreateChatCompletionJsonBodyReqPayloadFunctionCallType1, Unset]):
        functions (Union[Unset, List['CreateChatCompletionJsonBodyReqPayloadFunctionsItem']]):
        n (Union[Unset, float]):
        max_tokens (Union[Unset, float]):
        temperature (Union[Unset, float]):
        stream (Union[Unset, bool]):
    """

    model: str
    messages: List["CreateChatCompletionJsonBodyReqPayloadMessagesItem"]
    function_call: Union[
        "CreateChatCompletionJsonBodyReqPayloadFunctionCallType2",
        CreateChatCompletionJsonBodyReqPayloadFunctionCallType0,
        CreateChatCompletionJsonBodyReqPayloadFunctionCallType1,
        Unset,
    ] = UNSET
    functions: Union[Unset, List["CreateChatCompletionJsonBodyReqPayloadFunctionsItem"]] = UNSET
    n: Union[Unset, float] = UNSET
    max_tokens: Union[Unset, float] = UNSET
    temperature: Union[Unset, float] = UNSET
    stream: Union[Unset, bool] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        model = self.model
        messages = []
        for messages_item_data in self.messages:
            messages_item = messages_item_data.to_dict()

            messages.append(messages_item)

        function_call: Union[Dict[str, Any], Unset, str]
        if isinstance(self.function_call, Unset):
            function_call = UNSET

        elif isinstance(self.function_call, CreateChatCompletionJsonBodyReqPayloadFunctionCallType0):
            function_call = UNSET
            if not isinstance(self.function_call, Unset):
                function_call = self.function_call.value

        elif isinstance(self.function_call, CreateChatCompletionJsonBodyReqPayloadFunctionCallType1):
            function_call = UNSET
            if not isinstance(self.function_call, Unset):
                function_call = self.function_call.value

        else:
            function_call = UNSET
            if not isinstance(self.function_call, Unset):
                function_call = self.function_call.to_dict()

        functions: Union[Unset, List[Dict[str, Any]]] = UNSET
        if not isinstance(self.functions, Unset):
            functions = []
            for functions_item_data in self.functions:
                functions_item = functions_item_data.to_dict()

                functions.append(functions_item)

        n = self.n
        max_tokens = self.max_tokens
        temperature = self.temperature
        stream = self.stream

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "model": model,
                "messages": messages,
            }
        )
        if function_call is not UNSET:
            field_dict["function_call"] = function_call
        if functions is not UNSET:
            field_dict["functions"] = functions
        if n is not UNSET:
            field_dict["n"] = n
        if max_tokens is not UNSET:
            field_dict["max_tokens"] = max_tokens
        if temperature is not UNSET:
            field_dict["temperature"] = temperature
        if stream is not UNSET:
            field_dict["stream"] = stream

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_req_payload_function_call_type_2 import (
            CreateChatCompletionJsonBodyReqPayloadFunctionCallType2,
        )
        from ..models.create_chat_completion_json_body_req_payload_functions_item import (
            CreateChatCompletionJsonBodyReqPayloadFunctionsItem,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItem,
        )

        d = src_dict.copy()
        model = d.pop("model")

        messages = []
        _messages = d.pop("messages")
        for messages_item_data in _messages:
            messages_item = CreateChatCompletionJsonBodyReqPayloadMessagesItem.from_dict(messages_item_data)

            messages.append(messages_item)

        def _parse_function_call(
            data: object,
        ) -> Union[
            "CreateChatCompletionJsonBodyReqPayloadFunctionCallType2",
            CreateChatCompletionJsonBodyReqPayloadFunctionCallType0,
            CreateChatCompletionJsonBodyReqPayloadFunctionCallType1,
            Unset,
        ]:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _function_call_type_0 = data
                function_call_type_0: Union[Unset, CreateChatCompletionJsonBodyReqPayloadFunctionCallType0]
                if isinstance(_function_call_type_0, Unset):
                    function_call_type_0 = UNSET
                else:
                    function_call_type_0 = CreateChatCompletionJsonBodyReqPayloadFunctionCallType0(
                        _function_call_type_0
                    )

                return function_call_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _function_call_type_1 = data
                function_call_type_1: Union[Unset, CreateChatCompletionJsonBodyReqPayloadFunctionCallType1]
                if isinstance(_function_call_type_1, Unset):
                    function_call_type_1 = UNSET
                else:
                    function_call_type_1 = CreateChatCompletionJsonBodyReqPayloadFunctionCallType1(
                        _function_call_type_1
                    )

                return function_call_type_1
            except:  # noqa: E722
                pass
            if not isinstance(data, dict):
                raise TypeError()
            _function_call_type_2 = data
            function_call_type_2: Union[Unset, CreateChatCompletionJsonBodyReqPayloadFunctionCallType2]
            if isinstance(_function_call_type_2, Unset):
                function_call_type_2 = UNSET
            else:
                function_call_type_2 = CreateChatCompletionJsonBodyReqPayloadFunctionCallType2.from_dict(
                    _function_call_type_2
                )

            return function_call_type_2

        function_call = _parse_function_call(d.pop("function_call", UNSET))

        functions = []
        _functions = d.pop("functions", UNSET)
        for functions_item_data in _functions or []:
            functions_item = CreateChatCompletionJsonBodyReqPayloadFunctionsItem.from_dict(functions_item_data)

            functions.append(functions_item)

        n = d.pop("n", UNSET)

        max_tokens = d.pop("max_tokens", UNSET)

        temperature = d.pop("temperature", UNSET)

        stream = d.pop("stream", UNSET)

        create_chat_completion_json_body_req_payload = cls(
            model=model,
            messages=messages,
            function_call=function_call,
            functions=functions,
            n=n,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=stream,
        )

        return create_chat_completion_json_body_req_payload
