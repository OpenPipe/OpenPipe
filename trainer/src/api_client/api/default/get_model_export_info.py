from http import HTTPStatus
from typing import Any, Dict, Optional, Union

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_model_export_info_response_200 import GetModelExportInfoResponse200
from ...types import UNSET, Response


def _get_kwargs(
    *,
    export_id: str,
) -> Dict[str, Any]:
    pass

    params: Dict[str, Any] = {}
    params["exportId"] = export_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    return {
        "method": "get",
        "url": "/export/get-info",
        "params": params,
    }


def _parse_response(
    *, client: Union[AuthenticatedClient, Client], response: httpx.Response
) -> Optional[GetModelExportInfoResponse200]:
    if response.status_code == HTTPStatus.OK:
        response_200 = GetModelExportInfoResponse200.from_dict(response.json())

        return response_200
    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: Union[AuthenticatedClient, Client], response: httpx.Response
) -> Response[GetModelExportInfoResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    export_id: str,
) -> Response[GetModelExportInfoResponse200]:
    """Get info necessary to export a model

    Args:
        export_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetModelExportInfoResponse200]
    """

    kwargs = _get_kwargs(
        export_id=export_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    export_id: str,
) -> Optional[GetModelExportInfoResponse200]:
    """Get info necessary to export a model

    Args:
        export_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetModelExportInfoResponse200
    """

    return sync_detailed(
        client=client,
        export_id=export_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    export_id: str,
) -> Response[GetModelExportInfoResponse200]:
    """Get info necessary to export a model

    Args:
        export_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetModelExportInfoResponse200]
    """

    kwargs = _get_kwargs(
        export_id=export_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    export_id: str,
) -> Optional[GetModelExportInfoResponse200]:
    """Get info necessary to export a model

    Args:
        export_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetModelExportInfoResponse200
    """

    return (
        await asyncio_detailed(
            client=client,
            export_id=export_id,
        )
    ).parsed
