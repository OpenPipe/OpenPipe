import { describe, expect, it } from "vitest";
import {
  isMiniMaxModel,
  extractMiniMaxModel,
  stripThinkingTags,
  MINIMAX_MODELS,
} from "./minimax";

describe("isMiniMaxModel", () => {
  it("should return true for minimax: prefixed models", () => {
    expect(isMiniMaxModel("minimax:MiniMax-M2.7")).toBe(true);
    expect(isMiniMaxModel("minimax:MiniMax-M2.7-highspeed")).toBe(true);
    expect(isMiniMaxModel("minimax:MiniMax-M2.5")).toBe(true);
    expect(isMiniMaxModel("minimax:MiniMax-M2.5-highspeed")).toBe(true);
  });

  it("should return false for non-minimax models", () => {
    expect(isMiniMaxModel("gpt-4")).toBe(false);
    expect(isMiniMaxModel("gpt-3.5-turbo")).toBe(false);
    expect(isMiniMaxModel("openpipe:my-model")).toBe(false);
    expect(isMiniMaxModel("MiniMax-M2.7")).toBe(false);
    expect(isMiniMaxModel("")).toBe(false);
  });
});

describe("extractMiniMaxModel", () => {
  it("should extract model name from prefixed string", () => {
    expect(extractMiniMaxModel("minimax:MiniMax-M2.7")).toBe("MiniMax-M2.7");
    expect(extractMiniMaxModel("minimax:MiniMax-M2.7-highspeed")).toBe("MiniMax-M2.7-highspeed");
    expect(extractMiniMaxModel("minimax:MiniMax-M2.5")).toBe("MiniMax-M2.5");
    expect(extractMiniMaxModel("minimax:MiniMax-M2.5-highspeed")).toBe("MiniMax-M2.5-highspeed");
  });

  it("should handle model names without prefix", () => {
    expect(extractMiniMaxModel("MiniMax-M2.7")).toBe("MiniMax-M2.7");
  });
});

describe("stripThinkingTags", () => {
  it("should remove thinking tags from content", () => {
    const input = "<think>Let me reason about this...</think>The answer is 42.";
    expect(stripThinkingTags(input)).toBe("The answer is 42.");
  });

  it("should handle multiline thinking tags", () => {
    const input = "<think>\nStep 1: Consider X\nStep 2: Consider Y\n</think>\nFinal answer: Z";
    expect(stripThinkingTags(input)).toBe("Final answer: Z");
  });

  it("should handle content without thinking tags", () => {
    expect(stripThinkingTags("Hello, world!")).toBe("Hello, world!");
  });

  it("should handle null content", () => {
    expect(stripThinkingTags(null)).toBe(null);
  });

  it("should handle empty string", () => {
    expect(stripThinkingTags("")).toBe("");
  });

  it("should handle multiple thinking tags", () => {
    const input = "<think>First thought</think>Part 1 <think>Second thought</think>Part 2";
    expect(stripThinkingTags(input)).toBe("Part 1 Part 2");
  });
});

describe("MINIMAX_MODELS", () => {
  it("should contain MiniMax-M2.7", () => {
    expect(MINIMAX_MODELS["MiniMax-M2.7"]).toBeDefined();
    expect(MINIMAX_MODELS["MiniMax-M2.7"]!.contextWindow).toBe(1000000);
  });

  it("should contain MiniMax-M2.7-highspeed", () => {
    expect(MINIMAX_MODELS["MiniMax-M2.7-highspeed"]).toBeDefined();
    expect(MINIMAX_MODELS["MiniMax-M2.7-highspeed"]!.contextWindow).toBe(1000000);
  });

  it("should contain MiniMax-M2.5", () => {
    expect(MINIMAX_MODELS["MiniMax-M2.5"]).toBeDefined();
    expect(MINIMAX_MODELS["MiniMax-M2.5"]!.contextWindow).toBe(204800);
  });

  it("should contain MiniMax-M2.5-highspeed", () => {
    expect(MINIMAX_MODELS["MiniMax-M2.5-highspeed"]).toBeDefined();
    expect(MINIMAX_MODELS["MiniMax-M2.5-highspeed"]!.contextWindow).toBe(204800);
  });

  it("should have all expected models", () => {
    expect(Object.keys(MINIMAX_MODELS)).toHaveLength(4);
  });
});
