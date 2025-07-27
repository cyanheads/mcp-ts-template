/**
 * @fileoverview Tests for the tokenCounter utility.
 * @module tests/utils/metrics/tokenCounter.test
 */
import { describe, it, expect } from "vitest";
import {
  countTokens,
  countChatTokens,
} from "../../../src/utils/metrics/tokenCounter";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

describe("tokenCounter", () => {
  describe("countTokens", () => {
    it("should correctly count tokens in a simple string", async () => {
      const text = "hello world";
      const tokenCount = await countTokens(text);
      expect(tokenCount).toBe(2);
    });

    it("should return 0 for an empty string", async () => {
      const text = "";
      const tokenCount = await countTokens(text);
      expect(tokenCount).toBe(0);
    });
  });

  describe("countChatTokens", () => {
    it("should correctly count tokens for a series of chat messages", async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, how are you?" },
        {
          role: "assistant",
          content: "I am fine, thank you!",
        },
      ];
      const tokenCount = await countChatTokens(messages);
      expect(tokenCount).toBe(34);
    });

    it("should handle tool calls in assistant messages", async () => {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_123",
              type: "function",
              function: {
                name: "get_weather",
                arguments: '{"location": "Boston, MA"}',
              },
            },
          ],
        },
      ];
      const tokenCount = await countChatTokens(messages);
      expect(tokenCount).toBe(17);
    });

    it("should handle multi-part user messages", async () => {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "user",
          content: [
            { type: "text", text: "What is in this image?" },
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64," },
            },
          ],
        },
      ];
      const tokenCount = await countChatTokens(messages);
      expect(tokenCount).toBe(13);
    });
  });
});
