const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  // Must be a real (non-arrow) function so `new Anthropic()` in getClient()
  // works — an arrow function can't be used as a constructor.
  default: function MockAnthropic() {
    return { messages: { create: mockCreate } };
  },
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { extractJson, extractText, researchAndDraft, researchSignal } from "./research";

beforeEach(() => {
  mockCreate.mockReset();
});

const Schema = z.object({ companyName: z.string(), signal: z.string() });

describe("extractJson", () => {
  it("parses a JSON object wrapped in code fences with surrounding text", () => {
    const result = extractJson(
      'Here you go:\n```json\n{"companyName":"Acme","signal":"raised a seed round"}\n```\nHope that helps.',
      Schema
    );
    expect(result).toEqual({ companyName: "Acme", signal: "raised a seed round" });
  });

  it("throws a descriptive error when a required field is missing", () => {
    expect(() => extractJson('{"companyName":"Acme"}', Schema)).toThrow(/didn't match the expected shape/);
  });

  it("throws when a field has the wrong type", () => {
    expect(() => extractJson('{"companyName":123,"signal":"x"}', Schema)).toThrow(
      /didn't match the expected shape/
    );
  });

  it("throws when there's no JSON object in the text at all", () => {
    expect(() => extractJson("nothing specific and recent turned up", Schema)).toThrow(/No JSON found/);
  });

  it("throws a clear error on malformed JSON syntax", () => {
    expect(() => extractJson('{"companyName":"Acme", "signal":}', Schema)).toThrow(/not valid JSON/);
  });
});

describe("extractText", () => {
  it("concatenates only text blocks, ignoring tool_use/tool_result blocks", () => {
    const content = [
      { type: "server_tool_use", id: "t1", name: "web_search", input: {} },
      { type: "text", text: "first" },
      { type: "web_search_tool_result", tool_use_id: "t1", content: [] },
      { type: "text", text: "second" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any;
    expect(extractText(content)).toBe("first\nsecond");
  });

  it("returns an empty string when there are no text blocks", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(extractText([{ type: "server_tool_use", id: "t1", name: "web_search", input: {} } as any])).toBe("");
  });
});

// researchAndDraft/researchSignal wrap the Anthropic SDK — the module-level
// mock above swaps it out so these run without a real API key or network
// call, while still exercising the full extractText -> extractJson -> Zod
// pipeline through the public functions.
describe("researchAndDraft (mocked Anthropic client)", () => {
  it("parses and validates a well-formed draft response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "server_tool_use", id: "t1", name: "web_search", input: {} },
        {
          type: "text",
          text: JSON.stringify({
            companyName: "Acme",
            signal: "raised a $10M seed round last month",
            signalSource: "https://techcrunch.com/acme-seed",
            targetRole: "VP Sales",
            opener: "Saw the seed round news. Where's headcount growth breaking first?",
          }),
        },
      ],
    });

    const draft = await researchAndDraft("Acme", "acme.com");
    expect(draft.companyName).toBe("Acme");
    expect(draft.signalSource).toBe("https://techcrunch.com/acme-seed");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects a draft response missing a required field", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ companyName: "Acme" }) }],
    });

    await expect(researchAndDraft("Acme", "acme.com")).rejects.toThrow(/didn't match the expected shape/);
  });
});

describe("researchSignal (mocked Anthropic client)", () => {
  it("parses and validates a well-formed signal response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            companyName: "Acme",
            signal: "raised a $10M seed round",
            signalSource: "https://techcrunch.com/acme-seed",
            targetRole: "VP Sales",
            recency: 5,
            triggerStrength: 5,
            specificity: 4,
            total: 14,
            scoreReason: "Fresh, unambiguous, well-sourced.",
          }),
        },
      ],
    });

    const signal = await researchSignal("Acme", "acme.com");
    expect(signal.total).toBe(14);
    expect(signal.recency).toBe(5);
  });
});
