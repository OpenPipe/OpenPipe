from typing import TYPE_CHECKING, Any, Dict, Type, TypeVar, Union

from attrs import define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_chat_completion_json_body_req_payload_functions_item_parameters import (
        CreateChatCompletionJsonBodyReqPayloadFunctionsItemParameters,
    )


T = TypeVar("T", bound="CreateChatCompletionJsonBodyReqPayloadFunctionsItem")


@define
class CreateChatCompletionJsonBodyReqPayloadFunctionsItem:
    """
    Attributes:
        name (str):
        parameters (CreateChatCompletionJsonBodyReqPayloadFunctionsItemParameters):
        description (Union[Unset, str]):
    """

    name: str
    parameters: "CreateChatCompletionJsonBodyReqPayloadFunctionsItemParameters"
    description: Union[Unset, str] = UNSET

    def to_dict(self) -> Dict[str, Any]:
        name = self.name
        parameters = self.parameters.to_dict()

        description = self.description

        field_dict: Dict[str, Any] = {}
        field_dict.update(
            {
                "name": name,
                "parameters": parameters,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description

        return field_dict

    @classmethod
    def from_dict(cls: Type[T], src_dict: Dict[str, Any]) -> T:
        from ..models.create_chat_completion_json_body_req_payload_functions_item_parameters import (
            CreateChatCompletionJsonBodyReqPayloadFunctionsItemParameters,
        )

        d = src_dict.copy()
        name = d.pop("name")

        parameters = CreateChatCompletionJsonBodyReqPayloadFunctionsItemParameters.from_dict(d.pop("parameters"))

        description = d.pop("description", UNSET)

        create_chat_completion_json_body_req_payload_functions_item = cls(
            name=name,
            parameters=parameters,
            description=description,
        )

        return create_chat_completion_json_body_req_payload_functions_item
