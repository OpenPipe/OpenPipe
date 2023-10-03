from pydantic import BaseModel, Field
from typing import List


class Choice(BaseModel):
    text: str
    finish_reason: str


class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int


class Input(BaseModel):
    model: str
    prompt: str
    n: int = Field(1, alias="n")
    max_tokens: int = Field(4096, alias="max_tokens")
    temperature: float = Field(0.0, alias="temperature")


class Output(BaseModel):
    id: str
    choices: List[Choice]
    usage: Usage
