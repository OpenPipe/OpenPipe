from typing import TYPE_CHECKING, Any, Dict, List, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_json_body_function_call_type_0 import CreateChatCompletionJsonBodyFunctionCallType0
from ..models.create_chat_completion_json_body_function_call_type_1 import CreateChatCompletionJsonBodyFunctionCallType1
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_function_call_type_2 import (
        CreateChatCompletionJsonBodyFunctionCallType2,
    )
    from ..models.create_chat_completion_json_body_functions_item import CreateChatCompletionJsonBodyFunctionsItem
    from ..models.create_chat_completion_json_body_messages_item import CreateChatCompletionJsonBodyMessagesItem
    from ..models.create_chat_completion_json_body_req_payload import CreateChatCompletionJsonBodyReqPayload


T = TypeVar("T", bound="CreateChatCompletionJsonBody")


@define
class CreateChatCompletionJsonBody:
    """
    Attributes:
        req_payload (Union[Unset, CreateChatCompletionJsonBodyReqPayload]): DEPRECATED. Use the top-level fields instead
        model (Union[Unset, str]):
        messages (Union[Unset, List['CreateChatCompletionJsonBodyMessagesItem']]):
        function_call (Union['CreateChatCompletionJsonBodyFunctionCallType2',
            CreateChatCompletionJsonBodyFunctionCallType0, CreateChatCompletionJsonBodyFunctionCallType1, Unset]):
        functions (Union[Unset, List['CreateChatCompletionJsonBodyFunctionsItem']]):
        n (Union[Unset, None, float]):
        max_tokens (Union[Unset, float]):
        temperature (Union[Unset, None, float]):
        stream (Union[Unset, None, bool]):
    """

    req_payload: Union[Unset, "CreateChatCompletionJsonBodyReqPayload"] = UNSET
    model: Union[Unset, str] = UNSET
    messages: Union[Unset, List["CreateChatCompletionJsonBodyMessagesItem"]] = UNSET
    function_call: Union[
        "CreateChatCompletionJsonBodyFunctionCallType2",
        CreateChatCompletionJsonBodyFunctionCallType0,
        CreateChatCompletionJsonBodyFunctionCallType1,
        Unset,
    ] = UNSET
    functions: Union[Unset, List["CreateChatCompletionJsonBodyFunctionsItem"]] = UNSET
    n: Union[Unset, None, float] = UNSET
    max_tokens: Union[Unset, float] = UNSET
    temperature: Union[Unset, None, float] = UNSET
    stream: Union[Unset, None, bool] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        req_payload: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.req_payload, Unset):
            req_payload = self.req_payload.to_dict()

        model = self.model
        messages: Union[Unset, List[Dict[str, Any]]] = UNSET
        if not isinstance(self.messages, Unset):
            messages = []
            for messages_item_data in self.messages:
                messages_item = messages_item_data.to_dict()

                messages.append(messages_item)

        function_call: Union[Dict[str, Any], Unset, str]
        if isinstance(self.function_call, Unset):
            function_call = UNSET

        elif isinstance(self.function_call, CreateChatCompletionJsonBodyFunctionCallType0):
            function_call = UNSET
            if not isinstance(self.function_call, Unset):
                function_call = self.function_call.value

        elif isinstance(self.function_call, CreateChatCompletionJsonBodyFunctionCallType1):
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
        field_dict.update({})
        if req_payload is not UNSET:
            field_dict["reqPayload"] = req_payload
        if model is not UNSET:
            field_dict["model"] = model
        if messages is not UNSET:
            field_dict["messages"] = messages
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
        from ..models.create_chat_completion_json_body_function_call_type_2 import (
            CreateChatCompletionJsonBodyFunctionCallType2,
        )
        from ..models.create_chat_completion_json_body_functions_item import CreateChatCompletionJsonBodyFunctionsItem
        from ..models.create_chat_completion_json_body_messages_item import CreateChatCompletionJsonBodyMessagesItem
        from ..models.create_chat_completion_json_body_req_payload import CreateChatCompletionJsonBodyReqPayload

        d = src_dict.copy()
        _req_payload = d.pop("reqPayload", UNSET)
        req_payload: Union[Unset, CreateChatCompletionJsonBodyReqPayload]
        if isinstance(_req_payload, Unset):
            req_payload = UNSET
        else:
            req_payload = CreateChatCompletionJsonBodyReqPayload.from_dict(_req_payload)

        model = d.pop("model", UNSET)

        messages = []
        _messages = d.pop("messages", UNSET)
        for messages_item_data in _messages or []:
            messages_item = CreateChatCompletionJsonBodyMessagesItem.from_dict(messages_item_data)

            messages.append(messages_item)

        def _parse_function_call(
            data: object,
        ) -> Union[
            "CreateChatCompletionJsonBodyFunctionCallType2",
            CreateChatCompletionJsonBodyFunctionCallType0,
            CreateChatCompletionJsonBodyFunctionCallType1,
            Unset,
        ]:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _function_call_type_0 = data
                function_call_type_0: Union[Unset, CreateChatCompletionJsonBodyFunctionCallType0]
                if isinstance(_function_call_type_0, Unset):
                    function_call_type_0 = UNSET
                else:
                    function_call_type_0 = CreateChatCompletionJsonBodyFunctionCallType0(_function_call_type_0)

                return function_call_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _function_call_type_1 = data
                function_call_type_1: Union[Unset, CreateChatCompletionJsonBodyFunctionCallType1]
                if isinstance(_function_call_type_1, Unset):
                    function_call_type_1 = UNSET
                else:
                    function_call_type_1 = CreateChatCompletionJsonBodyFunctionCallType1(_function_call_type_1)

                return function_call_type_1
            except:  # noqa: E722
                pass
            if not isinstance(data, dict):
                raise TypeError()
            _function_call_type_2 = data
            function_call_type_2: Union[Unset, CreateChatCompletionJsonBodyFunctionCallType2]
            if isinstance(_function_call_type_2, Unset):
                function_call_type_2 = UNSET
            else:
                function_call_type_2 = CreateChatCompletionJsonBodyFunctionCallType2.from_dict(_function_call_type_2)

            return function_call_type_2

        function_call = _parse_function_call(d.pop("function_call", UNSET))

        functions = []
        _functions = d.pop("functions", UNSET)
        for functions_item_data in _functions or []:
            functions_item = CreateChatCompletionJsonBodyFunctionsItem.from_dict(functions_item_data)

            functions.append(functions_item)

        n = d.pop("n", UNSET)

        max_tokens = d.pop("max_tokens", UNSET)

        temperature = d.pop("temperature", UNSET)

        stream = d.pop("stream", UNSET)

        create_chat_completion_json_body = cls(
            req_payload=req_payload,
            model=model,
            messages=messages,
            function_call=function_call,
            functions=functions,
            n=n,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=stream,
        )

        return create_chat_completion_json_body
