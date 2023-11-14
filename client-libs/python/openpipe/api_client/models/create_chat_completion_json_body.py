from typing import TYPE_CHECKING, Any, Dict, List, Type, TypeVar, Union

from attrs import define

from ..models.create_chat_completion_json_body_function_call_type_0 import CreateChatCompletionJsonBodyFunctionCallType0
from ..models.create_chat_completion_json_body_function_call_type_1 import CreateChatCompletionJsonBodyFunctionCallType1
from ..models.create_chat_completion_json_body_tool_choice_type_0 import CreateChatCompletionJsonBodyToolChoiceType0
from ..models.create_chat_completion_json_body_tool_choice_type_1 import CreateChatCompletionJsonBodyToolChoiceType1
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_function_call_type_2 import (
        CreateChatCompletionJsonBodyFunctionCallType2,
    )
    from ..models.create_chat_completion_json_body_functions_item import CreateChatCompletionJsonBodyFunctionsItem
    from ..models.create_chat_completion_json_body_messages_item_type_0 import (
        CreateChatCompletionJsonBodyMessagesItemType0,
    )
    from ..models.create_chat_completion_json_body_messages_item_type_1 import (
        CreateChatCompletionJsonBodyMessagesItemType1,
    )
    from ..models.create_chat_completion_json_body_messages_item_type_2 import (
        CreateChatCompletionJsonBodyMessagesItemType2,
    )
    from ..models.create_chat_completion_json_body_messages_item_type_3 import (
        CreateChatCompletionJsonBodyMessagesItemType3,
    )
    from ..models.create_chat_completion_json_body_messages_item_type_4 import (
        CreateChatCompletionJsonBodyMessagesItemType4,
    )
    from ..models.create_chat_completion_json_body_req_payload import CreateChatCompletionJsonBodyReqPayload
    from ..models.create_chat_completion_json_body_tool_choice_type_2 import CreateChatCompletionJsonBodyToolChoiceType2
    from ..models.create_chat_completion_json_body_tools_item import CreateChatCompletionJsonBodyToolsItem


T = TypeVar("T", bound="CreateChatCompletionJsonBody")


@define
class CreateChatCompletionJsonBody:
    """
    Attributes:
        req_payload (Union[Unset, CreateChatCompletionJsonBodyReqPayload]): DEPRECATED. Use the top-level fields instead
        model (Union[Unset, str]):
        messages (Union[Unset, List[Union['CreateChatCompletionJsonBodyMessagesItemType0',
            'CreateChatCompletionJsonBodyMessagesItemType1', 'CreateChatCompletionJsonBodyMessagesItemType2',
            'CreateChatCompletionJsonBodyMessagesItemType3', 'CreateChatCompletionJsonBodyMessagesItemType4']]]):
        function_call (Union['CreateChatCompletionJsonBodyFunctionCallType2',
            CreateChatCompletionJsonBodyFunctionCallType0, CreateChatCompletionJsonBodyFunctionCallType1, Unset]):
        functions (Union[Unset, List['CreateChatCompletionJsonBodyFunctionsItem']]):
        tool_choice (Union['CreateChatCompletionJsonBodyToolChoiceType2', CreateChatCompletionJsonBodyToolChoiceType0,
            CreateChatCompletionJsonBodyToolChoiceType1, Unset]):
        tools (Union[Unset, List['CreateChatCompletionJsonBodyToolsItem']]):
        n (Union[Unset, None, float]):
        max_tokens (Union[Unset, None, float]):
        temperature (Union[Unset, None, float]):
        stream (Union[Unset, None, bool]):
    """

    req_payload: Union[Unset, "CreateChatCompletionJsonBodyReqPayload"] = UNSET
    model: Union[Unset, str] = UNSET
    messages: Union[
        Unset,
        List[
            Union[
                "CreateChatCompletionJsonBodyMessagesItemType0",
                "CreateChatCompletionJsonBodyMessagesItemType1",
                "CreateChatCompletionJsonBodyMessagesItemType2",
                "CreateChatCompletionJsonBodyMessagesItemType3",
                "CreateChatCompletionJsonBodyMessagesItemType4",
            ]
        ],
    ] = UNSET
    function_call: Union[
        "CreateChatCompletionJsonBodyFunctionCallType2",
        CreateChatCompletionJsonBodyFunctionCallType0,
        CreateChatCompletionJsonBodyFunctionCallType1,
        Unset,
    ] = UNSET
    functions: Union[Unset, List["CreateChatCompletionJsonBodyFunctionsItem"]] = UNSET
    tool_choice: Union[
        "CreateChatCompletionJsonBodyToolChoiceType2",
        CreateChatCompletionJsonBodyToolChoiceType0,
        CreateChatCompletionJsonBodyToolChoiceType1,
        Unset,
    ] = UNSET
    tools: Union[Unset, List["CreateChatCompletionJsonBodyToolsItem"]] = UNSET
    n: Union[Unset, None, float] = UNSET
    max_tokens: Union[Unset, None, float] = UNSET
    temperature: Union[Unset, None, float] = UNSET
    stream: Union[Unset, None, bool] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        from ..models.create_chat_completion_json_body_messages_item_type_0 import (
            CreateChatCompletionJsonBodyMessagesItemType0,
        )
        from ..models.create_chat_completion_json_body_messages_item_type_1 import (
            CreateChatCompletionJsonBodyMessagesItemType1,
        )
        from ..models.create_chat_completion_json_body_messages_item_type_2 import (
            CreateChatCompletionJsonBodyMessagesItemType2,
        )
        from ..models.create_chat_completion_json_body_messages_item_type_3 import (
            CreateChatCompletionJsonBodyMessagesItemType3,
        )

        req_payload: Union[Unset, Dict[str, Any]] = UNSET
        if not isinstance(self.req_payload, Unset):
            req_payload = self.req_payload.to_dict()

        model = self.model
        messages: Union[Unset, List[Dict[str, Any]]] = UNSET
        if not isinstance(self.messages, Unset):
            messages = []
            for messages_item_data in self.messages:
                messages_item: Dict[str, Any]

                if isinstance(messages_item_data, CreateChatCompletionJsonBodyMessagesItemType0):
                    messages_item = messages_item_data.to_dict()

                elif isinstance(messages_item_data, CreateChatCompletionJsonBodyMessagesItemType1):
                    messages_item = messages_item_data.to_dict()

                elif isinstance(messages_item_data, CreateChatCompletionJsonBodyMessagesItemType2):
                    messages_item = messages_item_data.to_dict()

                elif isinstance(messages_item_data, CreateChatCompletionJsonBodyMessagesItemType3):
                    messages_item = messages_item_data.to_dict()

                else:
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

        tool_choice: Union[Dict[str, Any], Unset, str]
        if isinstance(self.tool_choice, Unset):
            tool_choice = UNSET

        elif isinstance(self.tool_choice, CreateChatCompletionJsonBodyToolChoiceType0):
            tool_choice = UNSET
            if not isinstance(self.tool_choice, Unset):
                tool_choice = self.tool_choice.value

        elif isinstance(self.tool_choice, CreateChatCompletionJsonBodyToolChoiceType1):
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
        if stream is not UNSET:
            field_dict["stream"] = stream

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_function_call_type_2 import (
            CreateChatCompletionJsonBodyFunctionCallType2,
        )
        from ..models.create_chat_completion_json_body_functions_item import CreateChatCompletionJsonBodyFunctionsItem
        from ..models.create_chat_completion_json_body_messages_item_type_0 import (
            CreateChatCompletionJsonBodyMessagesItemType0,
        )
        from ..models.create_chat_completion_json_body_messages_item_type_1 import (
            CreateChatCompletionJsonBodyMessagesItemType1,
        )
        from ..models.create_chat_completion_json_body_messages_item_type_2 import (
            CreateChatCompletionJsonBodyMessagesItemType2,
        )
        from ..models.create_chat_completion_json_body_messages_item_type_3 import (
            CreateChatCompletionJsonBodyMessagesItemType3,
        )
        from ..models.create_chat_completion_json_body_messages_item_type_4 import (
            CreateChatCompletionJsonBodyMessagesItemType4,
        )
        from ..models.create_chat_completion_json_body_req_payload import CreateChatCompletionJsonBodyReqPayload
        from ..models.create_chat_completion_json_body_tool_choice_type_2 import (
            CreateChatCompletionJsonBodyToolChoiceType2,
        )
        from ..models.create_chat_completion_json_body_tools_item import CreateChatCompletionJsonBodyToolsItem

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

            def _parse_messages_item(
                data: object,
            ) -> Union[
                "CreateChatCompletionJsonBodyMessagesItemType0",
                "CreateChatCompletionJsonBodyMessagesItemType1",
                "CreateChatCompletionJsonBodyMessagesItemType2",
                "CreateChatCompletionJsonBodyMessagesItemType3",
                "CreateChatCompletionJsonBodyMessagesItemType4",
            ]:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    messages_item_type_0 = CreateChatCompletionJsonBodyMessagesItemType0.from_dict(data)

                    return messages_item_type_0
                except:  # noqa: E722
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    messages_item_type_1 = CreateChatCompletionJsonBodyMessagesItemType1.from_dict(data)

                    return messages_item_type_1
                except:  # noqa: E722
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    messages_item_type_2 = CreateChatCompletionJsonBodyMessagesItemType2.from_dict(data)

                    return messages_item_type_2
                except:  # noqa: E722
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    messages_item_type_3 = CreateChatCompletionJsonBodyMessagesItemType3.from_dict(data)

                    return messages_item_type_3
                except:  # noqa: E722
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                messages_item_type_4 = CreateChatCompletionJsonBodyMessagesItemType4.from_dict(data)

                return messages_item_type_4

            messages_item = _parse_messages_item(messages_item_data)

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

        def _parse_tool_choice(
            data: object,
        ) -> Union[
            "CreateChatCompletionJsonBodyToolChoiceType2",
            CreateChatCompletionJsonBodyToolChoiceType0,
            CreateChatCompletionJsonBodyToolChoiceType1,
            Unset,
        ]:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _tool_choice_type_0 = data
                tool_choice_type_0: Union[Unset, CreateChatCompletionJsonBodyToolChoiceType0]
                if isinstance(_tool_choice_type_0, Unset):
                    tool_choice_type_0 = UNSET
                else:
                    tool_choice_type_0 = CreateChatCompletionJsonBodyToolChoiceType0(_tool_choice_type_0)

                return tool_choice_type_0
            except:  # noqa: E722
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                _tool_choice_type_1 = data
                tool_choice_type_1: Union[Unset, CreateChatCompletionJsonBodyToolChoiceType1]
                if isinstance(_tool_choice_type_1, Unset):
                    tool_choice_type_1 = UNSET
                else:
                    tool_choice_type_1 = CreateChatCompletionJsonBodyToolChoiceType1(_tool_choice_type_1)

                return tool_choice_type_1
            except:  # noqa: E722
                pass
            if not isinstance(data, dict):
                raise TypeError()
            _tool_choice_type_2 = data
            tool_choice_type_2: Union[Unset, CreateChatCompletionJsonBodyToolChoiceType2]
            if isinstance(_tool_choice_type_2, Unset):
                tool_choice_type_2 = UNSET
            else:
                tool_choice_type_2 = CreateChatCompletionJsonBodyToolChoiceType2.from_dict(_tool_choice_type_2)

            return tool_choice_type_2

        tool_choice = _parse_tool_choice(d.pop("tool_choice", UNSET))

        tools = []
        _tools = d.pop("tools", UNSET)
        for tools_item_data in _tools or []:
            tools_item = CreateChatCompletionJsonBodyToolsItem.from_dict(tools_item_data)

            tools.append(tools_item)

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
            tool_choice=tool_choice,
            tools=tools,
            n=n,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=stream,
        )

        return create_chat_completion_json_body
