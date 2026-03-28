import { describe, expect, it } from "vitest";
import {
  isMiniMaxModel,
  extractMiniMaxModel,
  stripThinkingTags,
  MINIMAX_MODELS,
} from "~/server/utils/minimax";
import minimaxModelProvider from "~/modelProviders/minimax-ChatCompletion/index";
import frontendModelProvider from "~/modelProviders/minimax-ChatCompletion/frontend";

/**
 * Integration tests for MiniMax provider in OpenPipe.
 *
 * These tests verify the MiniMax integration works correctly across
 * the model detection, routing, and metadata layers.
 *
 * To run actual API tests, set MINIMAX_API_KEY in your environment.
 */

describe("MiniMax Integration", () => {
  describe("model routing integration", () => {
    it("should correctly identify and extract MiniMax models", () => {
      const model = "minimax:MiniMax-M2.7";
      expect(isMiniMaxModel(model)).toBe(true);
      const extracted = extractMiniMaxModel(model);
      expect(extracted).toBe("MiniMax-M2.7");
      expect(MINIMAX_MODELS[extracted]).toBeDefined();
    });

    it("should not route non-minimax models to MiniMax", () => {
      expect(isMiniMaxModel("gpt-4")).toBe(false);
      expect(isMiniMaxModel("openpipe:my-model")).toBe(false);
      expect(isMiniMaxModel("claude-3-opus")).toBe(false);
    });

    it("should correctly map all supported MiniMax models", () => {
      const supportedModels = [
        "MiniMax-M2.7",
        "MiniMax-M2.7-highspeed",
        "MiniMax-M2.5",
        "MiniMax-M2.5-highspeed",
      ];

      for (const model of supportedModels) {
        const prefixed = `minimax:${model}`;
        expect(isMiniMaxModel(prefixed)).toBe(true);
        expect(extractMiniMaxModel(prefixed)).toBe(model);
        expect(MINIMAX_MODELS[model]).toBeDefined();
        expect(frontendModelProvider.models[model as keyof typeof frontendModelProvider.models]).toBeDefined();
      }
    });
  });

  describe("model metadata consistency", () => {
    it("should have consistent model definitions between MINIMAX_MODELS and frontend", () => {
      for (const [modelId, modelInfo] of Object.entries(MINIMAX_MODELS)) {
        const frontendModel =
          frontendModelProvider.models[modelId as keyof typeof frontendModelProvider.models];
        expect(frontendModel).toBeDefined();
        expect(frontendModel.contextWindow).toBe(modelInfo.contextWindow);
      }
    });

    it("should have valid pricing for all models", () => {
      for (const [, model] of Object.entries(frontendModelProvider.models)) {
        expect(model.promptTokenPrice).toBeGreaterThan(0);
        expect(model.completionTokenPrice).toBeGreaterThan(0);
        expect(model.completionTokenPrice).toBeGreaterThanOrEqual(model.promptTokenPrice);
      }
    });
  });

  describe("usage calculation integration", () => {
    it("should calculate cost correctly for MiniMax models via proxy", () => {
      const models = Object.keys(frontendModelProvider.models) as Array<
        keyof typeof frontendModelProvider.models
      >;

      for (const model of models) {
        const input = {
          model: `minimax:${model}`,
          messages: [{ role: "user" as const, content: "test" }],
        };

        const output = {
          id: "test-id",
          object: "chat.completion" as const,
          created: Date.now(),
          model,
          choices: [
            {
              index: 0,
              message: { role: "assistant" as const, content: "response" },
              finish_reason: "stop" as const,
              logprobs: null,
            },
          ],
          usage: {
            prompt_tokens: 1000,
            completion_tokens: 500,
            total_tokens: 1500,
          },
        };

        const usage = minimaxModelProvider.getUsage(input, output);
        expect(usage.inputTokens).toBe(1000);
        expect(usage.outputTokens).toBe(500);
        expect(usage.cost).toBeDefined();
        expect(usage.cost).toBeGreaterThan(0);
      }
    });
  });

  describe("thinking tag stripping integration", () => {
    it("should strip thinking tags from typical MiniMax M2.7 responses", () => {
      const response =
        "<think>\nThe user is asking about fine-tuning.\nLet me provide a concise answer.\n</think>\n\nFine-tuning is the process of training a pre-trained model on a specific dataset.";
      const stripped = stripThinkingTags(response);
      expect(stripped).not.toContain("<think>");
      expect(stripped).not.toContain("</think>");
      expect(stripped).toContain("Fine-tuning is the process");
    });

    it("should preserve content that does not contain thinking tags", () => {
      const response = "This is a normal response without any thinking tags.";
      expect(stripThinkingTags(response)).toBe(response);
    });
  });
});
