from typing import TYPE_CHECKING, Any, Dict, List, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_json_body_req_payload_function_call_type_0 import (
    CreateChatCompletionJsonBodyReqPayloadFunctionCallType0,
)
from ..models.create_chat_completion_json_body_req_payload_function_call_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadFunctionCallType1,
)
from ..models.create_chat_completion_json_body_req_payload_tool_choice_type_0 import (
    CreateChatCompletionJsonBodyReqPayloadToolChoiceType0,
)
from ..models.create_chat_completion_json_body_req_payload_tool_choice_type_1 import (
    CreateChatCompletionJsonBodyReqPayloadToolChoiceType1,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_function_call_type_2 import (
        CreateChatCompletionJsonBodyReqPayloadFunctionCallType2,
    )
    from ..models.create_chat_completion_json_body_req_payload_functions_item import (
        CreateChatCompletionJsonBodyReqPayloadFunctionsItem,
    )
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_0 import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType0,
    )
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1 import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType1,
    )
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2 import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType2,
    )
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_3 import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType3,
    )
    from ..models.create_chat_completion_json_body_req_payload_messages_item_type_4 import (
        CreateChatCompletionJsonBodyReqPayloadMessagesItemType4,
    )
    from ..models.create_chat_completion_json_body_req_payload_response_format import (
        CreateChatCompletionJsonBodyReqPayloadResponseFormat,
    )
    from ..models.create_chat_completion_json_body_req_payload_tool_choice_type_2 import (
        CreateChatCompletionJsonBodyReqPayloadToolChoiceType2,
    )
    from ..models.create_chat_completion_json_body_req_payload_tools_item import (
        CreateChatCompletionJsonBodyReqPayloadToolsItem,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayload")


@define
class CreateChatCompletionJsonBodyReqPayload:
    """DEPRECATED. Use the top-level fields instead

    Attributes:
        model (str):
        messages (List[Union['CreateChatCompletionJsonBodyReqPayloadMessagesItemType0',
            'CreateChatCompletionJsonBodyReqPayloadMessagesItemType1',
            'CreateChatCompletionJsonBodyReqPayloadMessagesItemType2',
            'CreateChatCompletionJsonBodyReqPayloadMessagesItemType3',
            'CreateChatCompletionJsonBodyReqPayloadMessagesItemType4']]):
        function_call (Union['CreateChatCompletionJsonBodyReqPayloadFunctionCallType2',
            CreateChatCompletionJsonBodyReqPayloadFunctionCallType0,
            CreateChatCompletionJsonBodyReqPayloadFunctionCallType1, Unset]):
        functions (Union[Unset, List['CreateChatCompletionJsonBodyReqPayloadFunctionsItem']]):
        tool_choice (Union['CreateChatCompletionJsonBodyReqPayloadToolChoiceType2',
            CreateChatCompletionJsonBodyReqPayloadToolChoiceType0, CreateChatCompletionJsonBodyReqPayloadToolChoiceType1,
            Unset]):
        tools (Union[Unset, List['CreateChatCompletionJsonBodyReqPayloadToolsItem']]):
        n (Union[Unset, float]):
        max_tokens (Union[Unset, None, float]):
        temperature (Union[Unset, float]):
        response_format (Union[Unset, CreateChatCompletionJsonBodyReqPayloadResponseFormat]):
        stream (Union[Unset, bool]):
    """

    model: str
    messages: List[
        Union[
            "CreateChatCompletionJsonBodyReqPayloadMessagesItemType0",
            "CreateChatCompletionJsonBodyReqPayloadMessagesItemType1",
            "CreateChatCompletionJsonBodyReqPayloadMessagesItemType2",
            "CreateChatCompletionJsonBodyReqPayloadMessagesItemType3",
            "CreateChatCompletionJsonBodyReqPayloadMessagesItemType4",
        ]
    ]
    function_call: Union[
        "CreateChatCompletionJsonBodyReqPayloadFunctionCallType2",
        CreateChatCompletionJsonBodyReqPayloadFunctionCallType0,
        CreateChatCompletionJsonBodyReqPayloadFunctionCallType1,
        Unset,
    ] = UNSET
    functions: Union[Unset, List["CreateChatCompletionJsonBodyReqPayloadFunctionsItem"]] = UNSET
    tool_choice: Union[
        "CreateChatCompletionJsonBodyReqPayloadToolChoiceType2",
        CreateChatCompletionJsonBodyReqPayloadToolChoiceType0,
        CreateChatCompletionJsonBodyReqPayloadToolChoiceType1,
        Unset,
    ] = UNSET
    tools: Union[Unset, List["CreateChatCompletionJsonBodyReqPayloadToolsItem"]] = UNSET
    n: Union[Unset, float] = UNSET
    max_tokens: Union[Unset, None, float] = UNSET
    temperature: Union[Unset, float] = UNSET
    response_format: Union[Unset, "CreateChatCompletionJsonBodyReqPayloadResponseFormat"] = UNSET
    stream: Union[Unset, bool] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_0 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType0,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType2,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_3 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType3,
        )

        model = self.model
        messages = []
        for messages_item_data in self.messages:
            messages_item: Dict[str, Any]

            if isinstance(messages_item_data, CreateChatCompletionJsonBodyReqPayloadMessagesItemType0):
                messages_item = messages_item_data.to_dict()

            elif isinstance(messages_item_data, CreateChatCompletionJsonBodyReqPayloadMessagesItemType1):
                messages_item = messages_item_data.to_dict()

            elif isinstance(messages_item_data, CreateChatCompletionJsonBodyReqPayloadMessagesItemType2):
                messages_item = messages_item_data.to_dict()

            elif isinstance(messages_item_data, CreateChatCompletionJsonBodyReqPayloadMessagesItemType3):
                messages_item = messages_item_data.to_dict()

            else:
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

        tool_choice: Union[Dict[str, Any], Unset, str]
        if isinstance(self.tool_choice, Unset):
            tool_choice = UNSET

        elif isinstance(self.tool_choice, CreateChatCompletionJsonBodyReqPayloadToolChoiceType0):
            tool_choice = UNSET
            if not isinstance(self.tool_choice, Unset):
                tool_choice = self.tool_choice.value

        elif isinstance(self.tool_choice, CreateChatCompletionJsonBodyReqPayloadToolChoiceType1):
            tool_choice = UNSET
            if not isinstance(self.tool_choice, Unset):
                tool_choice = self.tool_choice.value

        else:
            tool_choice = UNSET
            if not isinstance(self.tool_choice, Unset):
                tool_choice = self.tool_choice.to_dict()

        tools: Union[Unset, List[Dict[str, Any]]] = UNSET
        if not isinstance(self.tools, Unset):
            tools = []
            for tools_item_data in self.tools:
                tools_item = tools_item_data.to_dict()

                tools.append(tools_item)

        n = self.n
        max_tokens = self.max_tokens
        temperature = self.temperature
        response_format: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.response_format, Unset):
            response_format = self.response_format.to_dict()

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
        if tool_choice is not UNSET:
            field_dict["tool_choice"] = tool_choice
        if tools is not UNSET:
            field_dict["tools"] = tools
        if n is not UNSET:
            field_dict["n"] = n
        if max_tokens is not UNSET:
            field_dict["max_tokens"] = max_tokens
        if temperature is not UNSET:
            field_dict["temperature"] = temperature
        if response_format is not UNSET:
            field_dict["response_format"] = response_format
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
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_0 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType0,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_1 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType1,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_2 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType2,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_3 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType3,
        )
        from ..models.create_chat_completion_json_body_req_payload_messages_item_type_4 import (
            CreateChatCompletionJsonBodyReqPayloadMessagesItemType4,
        )
        from ..models.create_chat_completion_json_body_req_payload_response_format import (
            CreateChatCompletionJsonBodyReqPayloadResponseFormat,
        )
        from ..models.create_chat_completion_json_body_req_payload_tool_choice_type_2 import (
            CreateChatCompletionJsonBodyReqPayloadToolChoiceType2,
        )
        from ..models.create_chat_completion_json_body_req_payload_tools_item import (
            CreateChatCompletionJsonBodyReqPayloadToolsItem,
        )

        d = src_dict.copy()
        model = d.pop("model")

        messages = []
        _messages = d.pop("messages")
        for messages_item_data in _messages:

            def _parse_messages_item(
                data: object,
            ) -> Union[
                "CreateChatCompletionJsonBodyReqPayloadMessagesItemType0",
                "CreateChatCompletionJsonBodyReqPayloadMessagesItemType1",
                "CreateChatCompletionJsonBodyReqPayloadMessagesItemType2",
                "CreateChatCompletionJsonBodyReqPayloadMessagesItemType3",
                "CreateChatCompletionJsonBodyReqPayloadMessagesItemType4",
            ]:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    messages_item_type_0 = CreateChatCompletionJsonBodyReqPayloadMessagesItemType0.from_dict(data)

                    return messages_item_type_0
                except:  # noqa: E722
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    messages_item_type_1 = CreateChatCompletionJsonBodyReqPayloadMessagesItemType1.from_dict(data)

                    return messages_item_type_1
                except:  # noqa: E722
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    messages_item_type_2 = CreateChatCompletionJsonBodyReqPayloadMessagesItemType2.from_dict(data)

                    return messages_item_type_2
                except:  # noqa: E722
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    messages_item_type_3 = CreateChatCompletionJsonBodyReqPayloadMessagesItemType3.from_dict(data)

                    return messages_item_type_3
                except:  # noqa: E722
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                messages_item_type_4 = CreateChatCompletionJsonBodyReqPayloadMessagesItemType4.from_dict(data)

                return messages_item_type_4

            messages_item = _parse_messages_item(messages_item_data)

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

        def _parse_tool_choice(
            data: object,
        ) -> Union[
            "CreateChatCompletionJsonBodyReqPayloadToolChoiceType2",
            CreateChatCompletionJsonBodyReqPayloadToolChoiceType0,
            CreateChatCompletionJsonBodyReqPayloadToolChoiceType1,
            Unset,
        ]:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _tool_choice_type_0 = data
                tool_choice_type_0: Union[Unset, CreateChatCompletionJsonBodyReqPayloadToolChoiceType0]
                if isinstance(_tool_choice_type_0, Unset):
                    tool_choice_type_0 = UNSET
                else:
                    tool_choice_type_0 = CreateChatCompletionJsonBodyReqPayloadToolChoiceType0(_tool_choice_type_0)

                return tool_choice_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _tool_choice_type_1 = data
                tool_choice_type_1: Union[Unset, CreateChatCompletionJsonBodyReqPayloadToolChoiceType1]
                if isinstance(_tool_choice_type_1, Unset):
                    tool_choice_type_1 = UNSET
                else:
                    tool_choice_type_1 = CreateChatCompletionJsonBodyReqPayloadToolChoiceType1(_tool_choice_type_1)

                return tool_choice_type_1
            except:  # noqa: E722
                pass
            if not isinstance(data, dict):
                raise TypeError()
            _tool_choice_type_2 = data
            tool_choice_type_2: Union[Unset, CreateChatCompletionJsonBodyReqPayloadToolChoiceType2]
            if isinstance(_tool_choice_type_2, Unset):
                tool_choice_type_2 = UNSET
            else:
                tool_choice_type_2 = CreateChatCompletionJsonBodyReqPayloadToolChoiceType2.from_dict(
                    _tool_choice_type_2
                )

            return tool_choice_type_2

        tool_choice = _parse_tool_choice(d.pop("tool_choice", UNSET))

        tools = []
        _tools = d.pop("tools", UNSET)
        for tools_item_data in _tools or []:
            tools_item = CreateChatCompletionJsonBodyReqPayloadToolsItem.from_dict(tools_item_data)

            tools.append(tools_item)

        n = d.pop("n", UNSET)

        max_tokens = d.pop("max_tokens", UNSET)

        temperature = d.pop("temperature", UNSET)

        _response_format = d.pop("response_format", UNSET)
        response_format: Union[Unset, CreateChatCompletionJsonBodyReqPayloadResponseFormat]
        if isinstance(_response_format, Unset):
            response_format = UNSET
        else:
            response_format = CreateChatCompletionJsonBodyReqPayloadResponseFormat.from_dict(_response_format)

        stream = d.pop("stream", UNSET)

        create_chat_completion_json_body_req_payload = cls(
            model=model,
            messages=messages,
            function_call=function_call,
            functions=functions,
            tool_choice=tool_choice,
            tools=tools,
            n=n,
            max_tokens=max_tokens,
            temperature=temperature,
            response_format=response_format,
            stream=stream,
        )

        return create_chat_completion_json_body_req_payload
