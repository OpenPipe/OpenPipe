from http import HTTPStatus
from typing import Any, Dict, Optional, Union

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.local_testing_only_get_latest_logged_call_response_200 import (
    LocalTestingOnlyGetLatestLoggedCallResponse200,
)
from ...types import Response


def _get_kwargs() -> Dict[str, Any]:
    pass

    return {
        "method": "get",
        "url": "/local-testing-only-get-latest-logged-call",
    }


def _parse_response(
    *, client: Union[AuthenticatedClient, Client], response: httpx.Response
) -> Optional[Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]]:
    if response.status_code == HTTPStatus.OK:
        _response_200 = response.json()
        response_200: Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]
        if _response_200 is None:
            response_200 = None
        else:
            response_200 = LocalTestingOnlyGetLatestLoggedCallResponse200.from_dict(_response_200)

        return response_200
    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: Union[AuthenticatedClient, Client], response: httpx.Response
) -> Response[Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
) -> Response[Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]]:
    """Get the latest logged call (only for local testing)

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]]
    """

    kwargs = _get_kwargs()

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
) -> Optional[Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]]:
    """Get the latest logged call (only for local testing)

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]
    """

    return sync_detailed(
        client=client,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
) -> Response[Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]]:
    """Get the latest logged call (only for local testing)

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]]
    """

    kwargs = _get_kwargs()

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
) -> Optional[Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]]:
    """Get the latest logged call (only for local testing)

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Optional[LocalTestingOnlyGetLatestLoggedCallResponse200]
    """

    return (
        await asyncio_detailed(
            client=client,
        )
    ).parsed
