import datetime

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel


class Message(BaseModel):
    role: str
    content: str


class Usage(BaseModel):
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int


class Choice(BaseModel):
    index: int
    message: Message
    finish_reason: str


class ResponsePayload(BaseModel):
    id: str
    model: str
    usage: Usage
    object: str
    choices: List[Choice]
    created: int


class RequestPayload(BaseModel):
    n: int
    model: str
    stream: bool
    messages: List[Message]
    temperature: float


class Call(BaseModel):
    id: str
    requestedAt: datetime
    receivedAt: datetime
    reqPayload: RequestPayload
    respPayload: ResponsePayload
    inputTokens: int
    outputTokens: int
    cost: float
    statusCode: int
    durationMs: int
    model: str
    tags: dict


class QueryResponse(BaseModel):
    calls: List[Call]
    count: int


class FilterCondition(BaseModel):
    field: str
    comparator: str
    value: str
