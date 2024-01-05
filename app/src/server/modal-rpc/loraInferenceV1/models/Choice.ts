/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Choice = {
  text: string;
  finish_reason: Choice.finish_reason;
};
export namespace Choice {
  export enum finish_reason {
    STOP = "stop",
    LENGTH = "length",
  }
}
