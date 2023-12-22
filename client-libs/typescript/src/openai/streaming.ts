import type { ChatCompletion, ChatCompletionChunk } from "openai/resources/chat";
import { Stream } from "openai/streaming";

import { OpenPipeMeta } from "../shared";
import mergeChunks from "./mergeChunks";

export class WrappedStream extends Stream<ChatCompletionChunk> {
  openpipe: OpenPipeMeta;

  private resolveReportingFinished: () => void = () => {};
  private report: (response: unknown) => Promise<void>;

  constructor(stream: Stream<ChatCompletionChunk>, report: (response: unknown) => Promise<void>) {
    // @ts-expect-error - This is a private property but we need to access it
    super(stream.iterator, stream.controller);
    this.report = report;

    const reportingFinished = new Promise<void>((resolve) => {
      this.resolveReportingFinished = resolve;
    });

    this.openpipe = {
      reportingFinished,
    };
  }

  async *[Symbol.asyncIterator](): AsyncIterator<ChatCompletionChunk, any, undefined> {
    const iterator = super[Symbol.asyncIterator]();

    let combinedResponse: ChatCompletion | null = null;
    while (true) {
      const result = await iterator.next();
      if (result.done) break;
      combinedResponse = mergeChunks(combinedResponse, result.value);

      yield result.value;
    }

    await this.report(combinedResponse);

    // Resolve the promise here
    this.resolveReportingFinished();
  }
}
