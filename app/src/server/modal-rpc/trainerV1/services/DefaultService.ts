/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { STOutput } from "../models/STOutput";
import type { TSOutput } from "../models/TSOutput";
import type { CancelablePromise } from "../core/CancelablePromise";
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
export class DefaultService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * Start Training
   * @param fineTuneId
   * @param baseUrl
   * @returns STOutput Successful Response
   * @throws ApiError
   */
  public startTraining(fineTuneId: string, baseUrl: string): CancelablePromise<STOutput> {
    return this.httpRequest.request({
      method: "POST",
      url: "/start_training",
      query: {
        fine_tune_id: fineTuneId,
        base_url: baseUrl,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Training Status
   * @param callId
   * @returns TSOutput Successful Response
   * @throws ApiError
   */
  public trainingStatus(callId: string): CancelablePromise<TSOutput> {
    return this.httpRequest.request({
      method: "GET",
      url: "/training_status",
      query: {
        call_id: callId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Persist Model Weights
   * @param modelName
   * @returns any Successful Response
   * @throws ApiError
   */
  public persistModelWeights(modelName: string): CancelablePromise<any> {
    return this.httpRequest.request({
      method: "POST",
      url: "/persist_model_weights",
      query: {
        model_name: modelName,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Export Weights
   * @param exportId
   * @param baseUrl
   * @returns any Successful Response
   * @throws ApiError
   */
  public exportWeights(exportId: string, baseUrl: string): CancelablePromise<any> {
    return this.httpRequest.request({
      method: "POST",
      url: "/export_weights",
      query: {
        export_id: exportId,
        base_url: baseUrl,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
