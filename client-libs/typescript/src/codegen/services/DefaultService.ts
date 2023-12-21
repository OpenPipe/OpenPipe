/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DefaultService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @deprecated
     * DEPRECATED: we no longer support prompt caching.
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
             * DEPRECATED. Use the top-level fields instead
             */
            reqPayload?: {
                model: string;
                messages: Array<({
                    role: 'system';
                    content: (string | 'null' | null);
                } | {
                    role: 'user';
                    content: (string | Array<({
                        type: 'image_url';
                        image_url: {
                            detail?: ('auto' | 'low' | 'high');
                            url: string;
                        };
                    } | {
                        type: 'text';
                        text: string;
                    })> | 'null' | null);
                } | {
                    role: 'assistant';
                    content?: (string | 'null' | null);
                    function_call?: {
                        name: string;
                        arguments: string;
                    };
                    tool_calls?: Array<{
                        id: string;
                        function: {
                            name: string;
                            arguments: string;
                        };
                        type: 'function';
                    }>;
                } | {
                    role: 'tool';
                    content: (string | 'null' | null);
                    tool_call_id: string;
                } | {
                    role: 'function';
                    name: string;
                    content: (string | 'null' | null);
                })>;
                function_call?: ('none' | 'auto' | {
                    name: string;
                });
                functions?: Array<{
                    name: string;
                    parameters: Record<string, any>;
                    description?: string;
                }>;
                tool_choice?: ('none' | 'auto' | {
                    type?: 'function';
                    function?: {
                        name: string;
                    };
                });
                tools?: Array<{
                    function: {
                        name: string;
                        parameters: Record<string, any>;
                        description?: string;
                    };
                    type: 'function';
                }>;
                'n'?: number;
                max_tokens?: number | null;
                temperature?: number;
                response_format?: {
                    type: ('text' | 'json_object');
                };
                stream?: boolean;
            };
            model?: string;
            messages?: Array<({
                role: 'system';
                content: (string | 'null' | null);
            } | {
                role: 'user';
                content: (string | Array<({
                    type: 'image_url';
                    image_url: {
                        detail?: ('auto' | 'low' | 'high');
                        url: string;
                    };
                } | {
                    type: 'text';
                    text: string;
                })> | 'null' | null);
            } | {
                role: 'assistant';
                content?: (string | 'null' | null);
                function_call?: {
                    name: string;
                    arguments: string;
                };
                tool_calls?: Array<{
                    id: string;
                    function: {
                        name: string;
                        arguments: string;
                    };
                    type: 'function';
                }>;
            } | {
                role: 'tool';
                content: (string | 'null' | null);
                tool_call_id: string;
            } | {
                role: 'function';
                name: string;
                content: (string | 'null' | null);
            })>;
            function_call?: ('none' | 'auto' | {
                name: string;
            });
            functions?: Array<{
                name: string;
                parameters: Record<string, any>;
                description?: string;
            }>;
            tool_choice?: ('none' | 'auto' | {
                type?: 'function';
                function?: {
                    name: string;
                };
            });
            tools?: Array<{
                function: {
                    name: string;
                    parameters: Record<string, any>;
                    description?: string;
                };
                type: 'function';
            }>;
            'n'?: number | null;
            max_tokens?: number | null;
            temperature?: number | null;
            stream?: boolean | null;
            response_format?: {
                type?: ('text' | 'json_object');
            };
        },
    ): CancelablePromise<{
        id: string;
        object: 'chat.completion';
        created: number;
        model: string;
        choices: Array<{
            finish_reason: ('length' | 'function_call' | 'tool_calls' | 'stop' | 'content_filter');
            index: number;
            message: {
                role: 'assistant';
                content?: (string | 'null' | null);
                function_call?: {
                    name: string;
                    arguments: string;
                };
                tool_calls?: Array<{
                    id: string;
                    function: {
                        name: string;
                        arguments: string;
                    };
                    type: 'function';
                }>;
            };
        }>;
        usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        };
    } | null> {
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
            requestedAt?: number;
            /**
             * Unix timestamp in milliseconds
             */
            receivedAt?: number;
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
        statusCode: number | null;
        errorMessage: string | null;
        reqPayload?: any;
        respPayload?: any;
        tags: Record<string, string | null>;
    } | null> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/local-testing-only-get-latest-logged-call',
        });
    }
}
