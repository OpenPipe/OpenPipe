/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class DefaultService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Check if a prompt is cached
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    public checkCache(
        requestBody: {
            /**
             * Unix timestamp in milliseconds
             */
            requestedAt: number;
            /**
             * JSON-encoded request payload
             */
            reqPayload?: any;
            /**
             * Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }
             */
            tags?: Record<string, string>;
        },
    ): CancelablePromise<{
        /**
         * JSON-encoded response payload
         */
        respPayload?: any;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/check-cache',
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Create completion for a prompt
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    public createChatCompletion(
        requestBody: {
            /**
             * JSON-encoded request payload
             */
            reqPayload?: any;
        },
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/chat/completions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Report an API call
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    public report(
        requestBody: {
            /**
             * Unix timestamp in milliseconds
             */
            requestedAt: number;
            /**
             * Unix timestamp in milliseconds
             */
            receivedAt: number;
            /**
             * JSON-encoded request payload
             */
            reqPayload?: any;
            /**
             * JSON-encoded response payload
             */
            respPayload?: any;
            /**
             * HTTP status code of response
             */
            statusCode?: number;
            /**
             * User-friendly error message
             */
            errorMessage?: string;
            /**
             * Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }
             */
            tags?: Record<string, string>;
        },
    ): CancelablePromise<{
        status: ('ok' | 'error');
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/report',
            body: requestBody,
            mediaType: 'application/json',
        });
    }

    /**
     * Get the latest logged call (only for local testing)
     * @returns any Successful response
     * @throws ApiError
     */
    public localTestingOnlyGetLatestLoggedCall(): CancelablePromise<{
        createdAt: string;
        cacheHit: boolean;
        tags: Record<string, string | null>;
        modelResponse: {
            id: string;
            statusCode: number | null;
            errorMessage: string | null;
            reqPayload?: any;
            respPayload?: any;
        } | null;
    } | null> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/local-testing-only-get-latest-logged-call',
        });
    }

}
