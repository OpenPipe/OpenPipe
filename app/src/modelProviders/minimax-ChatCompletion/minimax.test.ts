import { describe, expect, it } from "vitest";
import modelProvider from "./index";
import frontendModelProvider from "./frontend";

describe("MiniMax frontend model provider", () => {
  it("should have the correct provider name", () => {
    expect(frontendModelProvider.name).toBe("MiniMax ChatCompletion");
  });

  it("should contain MiniMax-M2.7 model", () => {
    const model = frontendModelProvider.models["MiniMax-M2.7"];
    expect(model).toBeDefined();
    expect(model.name).toBe("MiniMax-M2.7");
    expect(model.contextWindow).toBe(1000000);
    expect(model.provider).toBe("minimax/ChatCompletion");
    expect(model.promptTokenPrice).toBeGreaterThan(0);
    expect(model.completionTokenPrice).toBeGreaterThan(0);
  });

  it("should contain MiniMax-M2.7-highspeed model", () => {
    const model = frontendModelProvider.models["MiniMax-M2.7-highspeed"];
    expect(model).toBeDefined();
    expect(model.name).toBe("MiniMax-M2.7 Highspeed");
    expect(model.speed).toBe("fast");
  });

  it("should contain MiniMax-M2.5 model", () => {
    const model = frontendModelProvider.models["MiniMax-M2.5"];
    expect(model).toBeDefined();
    expect(model.contextWindow).toBe(204800);
  });

  it("should contain MiniMax-M2.5-highspeed model", () => {
    const model = frontendModelProvider.models["MiniMax-M2.5-highspeed"];
    expect(model).toBeDefined();
    expect(model.speed).toBe("fast");
  });

  it("should have 4 models total", () => {
    expect(Object.keys(frontendModelProvider.models)).toHaveLength(4);
  });

  it("should have learnMoreUrl for all models", () => {
    for (const [, model] of Object.entries(frontendModelProvider.models)) {
      expect(model.learnMoreUrl).toBe("https://platform.minimaxi.com");
    }
  });
});

describe("MiniMax model provider getUsage", () => {
  it("should calculate usage from completion response", () => {
    const input = {
      model: "minimax:MiniMax-M2.7",
      messages: [{ role: "user" as const, content: "Hello" }],
    };
    const output = {
      id: "test-id",
      object: "chat.completion" as const,
      created: Date.now(),
      model: "MiniMax-M2.7",
      choices: [
        {
          index: 0,
          message: { role: "assistant" as const, content: "Hi!" },
          finish_reason: "stop" as const,
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };

    const usage = modelProvider.getUsage(input, output);
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
    expect(usage.cost).toBeDefined();
    expect(usage.cost).toBeGreaterThan(0);
  });

  it("should return undefined cost for unknown models", () => {
    const input = {
      model: "minimax:unknown-model",
      messages: [{ role: "user" as const, content: "Hello" }],
    };
    const output = {
      id: "test-id",
      object: "chat.completion" as const,
      created: Date.now(),
      model: "unknown-model",
      choices: [
        {
          index: 0,
          message: { role: "assistant" as const, content: "Hi!" },
          finish_reason: "stop" as const,
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };

    const usage = modelProvider.getUsage(input, output);
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
    expect(usage.cost).toBeUndefined();
  });

  it("should return undefined tokens when no completion output", () => {
    const input = {
      model: "minimax:MiniMax-M2.7",
      messages: [{ role: "user" as const, content: "Hello" }],
    };

    const usage = modelProvider.getUsage(input);
    expect(usage.inputTokens).toBeUndefined();
    expect(usage.outputTokens).toBeUndefined();
    expect(usage.cost).toBeUndefined();
  });
});
