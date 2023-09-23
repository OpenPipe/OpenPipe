from http import HTTPStatus
from typing import Any, Dict, Optional, Union

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_training_info_response_200 import GetTrainingInfoResponse200
from ...types import UNSET, Response


def _get_kwargs(
    *,
    fine_tune_id: str,
) -> Dict[str, Any]:
    pass

    params: Dict[str, Any] = {}
    params["fineTuneId"] = fine_tune_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    return {
        "method": "get",
        "url": "/training-info",
        "params": params,
    }


def _parse_response(
    *, client: Union[AuthenticatedClient, Client], response: httpx.Response
) -> Optional[GetTrainingInfoResponse200]:
    if response.status_code == HTTPStatus.OK:
        response_200 = GetTrainingInfoResponse200.from_dict(response.json())

        return response_200
    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: Union[AuthenticatedClient, Client], response: httpx.Response
) -> Response[GetTrainingInfoResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    fine_tune_id: str,
) -> Response[GetTrainingInfoResponse200]:
    """Get info necessary to train a model

    Args:
        fine_tune_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetTrainingInfoResponse200]
    """

    kwargs = _get_kwargs(
        fine_tune_id=fine_tune_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    fine_tune_id: str,
) -> Optional[GetTrainingInfoResponse200]:
    """Get info necessary to train a model

    Args:
        fine_tune_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetTrainingInfoResponse200
    """

    return sync_detailed(
        client=client,
        fine_tune_id=fine_tune_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    fine_tune_id: str,
) -> Response[GetTrainingInfoResponse200]:
    """Get info necessary to train a model

    Args:
        fine_tune_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetTrainingInfoResponse200]
    """

    kwargs = _get_kwargs(
        fine_tune_id=fine_tune_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    fine_tune_id: str,
) -> Optional[GetTrainingInfoResponse200]:
    """Get info necessary to train a model

    Args:
        fine_tune_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetTrainingInfoResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
            fine_tune_id=fine_tune_id,
        )
    ).parsed
