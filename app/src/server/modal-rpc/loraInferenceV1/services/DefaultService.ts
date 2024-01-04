/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Input } from "../models/Input";
import type { Output } from "../models/Output";
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
export class DefaultService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * Chat Completion
   * @param requestBody
   * @returns Output Successful Response
   * @throws ApiError
   */
  public generate(requestBody: Input): CancelablePromise<Output> {
    return this.httpRequest.request({
      method: "POST",
      url: "/generate",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
