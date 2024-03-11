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
     * OpenAI-compatible route for generating inference and optionally logging the request.
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
                    content?: string;
                } | {
                    role: 'user';
                    content?: (string | Array<({
                        type: 'image_url';
                        image_url: {
                            detail?: ('auto' | 'low' | 'high');
                            url: string;
                        };
                    } | {
                        type: 'text';
                        text: string;
                    })>);
                } | {
                    role: 'assistant';
                    content?: (string | 'null' | null);
                    function_call?: {
                        name?: string;
                        arguments?: string;
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
                    content?: string;
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
                    parameters?: Record<string, any>;
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
                        parameters?: Record<string, any>;
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
                content?: string;
            } | {
                role: 'user';
                content?: (string | Array<({
                    type: 'image_url';
                    image_url: {
                        detail?: ('auto' | 'low' | 'high');
                        url: string;
                    };
                } | {
                    type: 'text';
                    text: string;
                })>);
            } | {
                role: 'assistant';
                content?: (string | 'null' | null);
                function_call?: {
                    name?: string;
                    arguments?: string;
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
                content?: string;
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
                parameters?: Record<string, any>;
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
                    parameters?: Record<string, any>;
                    description?: string;
                };
                type: 'function';
            }>;
            'n'?: number | null;
            max_tokens?: number | null;
            temperature?: number | null;
            stream?: boolean;
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
                    name?: string;
                    arguments?: string;
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
            logprobs?: {
                content: Array<{
                    token: string;
                    bytes: Array<number> | null;
                    logprob: number;
                    top_logprobs: Array<{
                        token: string;
                        bytes: Array<number> | null;
                        logprob: number;
                    }>;
                }> | null;
            } | null;
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
            tags?: Record<string, (string | number | boolean | 'null' | null)>;
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
     * Update tags for logged calls matching the provided filters
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    public updateLogTags(
        requestBody: {
            filters: Array<{
                /**
                 * The field to filter on. Possible fields include: `model`, `completionId`, and `tags.your_tag_name`.
                 */
                field: string;
                equals: (string | number | boolean);
            }>;
            /**
             * Extra tags to attach to the call for filtering. Eg { "userId": "123", "promptId": "populate-title" }
             */
            tags: Record<string, (string | number | boolean | 'null' | null)>;
        },
    ): CancelablePromise<{
        matchedLogs: number;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/logs/update-tags',
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
    /**
     * Create a new dataset. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    public unstableDatasetCreate(
        requestBody: {
            name: string;
        },
    ): CancelablePromise<{
        datasetId: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/unstable/dataset/create',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Add new dataset entries. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    public unstableDatasetEntryCreate(
        requestBody: {
            archiveId: string;
            entries: Array<{
                messages: Array<({
                    role: 'system';
                    content?: string;
                } | {
                    role: 'user';
                    content?: (string | Array<({
                        type: 'image_url';
                        image_url: {
                            detail?: ('auto' | 'low' | 'high');
                            url: string;
                        };
                    } | {
                        type: 'text';
                        text: string;
                    })>);
                } | {
                    role: 'assistant';
                    content?: (string | 'null' | null);
                    function_call?: {
                        name?: string;
                        arguments?: string;
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
                    content?: string;
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
                    parameters?: Record<string, any>;
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
                        parameters?: Record<string, any>;
                        description?: string;
                    };
                    type: 'function';
                }>;
                response_format?: {
                    type: ('text' | 'json_object');
                };
                split?: 'TRAIN' | 'TEST';
            }>;
        },
    ): CancelablePromise<{
        createdEntries: number;
        errors: Array<{
            index: number;
            message: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/unstable/dataset-entry/create',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Create a new finetune. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.
     * @param requestBody
     * @returns any Successful response
     * @throws ApiError
     */
    public unstableFinetuneCreate(
        requestBody: {
            datasetId: string;
            slug: string;
            baseModel: ('OpenPipe/mistral-ft-optimized-1227' | 'meta-llama/Llama-2-13b-hf' | 'mistralai/Mixtral-8x7B-Instruct-v0.1');
        },
    ): CancelablePromise<{
        id: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/unstable/finetune/create',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get a finetune by ID. Note, this endpoint is unstable and may change without notice. Do not use without consulting the OpenPipe team.
     * @param fineTuneId
     * @returns any Successful response
     * @throws ApiError
     */
    public unstableFinetuneGet(
        fineTuneId: string,
    ): CancelablePromise<{
        id: string;
        status: ('PENDING' | 'STARTED' | 'TRANSFERRING_TRAINING_DATA' | 'TRAINING' | 'DEPLOYED' | 'ERROR');
        slug: string;
        baseModel: string;
        errorMessage: string | null;
        datasetId: string;
        createdAt: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/unstable/finetune/get',
            query: {
                'fineTuneId': fineTuneId,
            },
        });
    }
}
