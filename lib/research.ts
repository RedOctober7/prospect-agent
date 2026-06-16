import Anthropic from "@anthropic-ai/sdk";

// Lazily constructed so ANTHROPIC_API_KEY is read from the environment at call
// time, not at import time. A standalone tsx script loads .env.local *after*
// its imports are evaluated (ESM hoists imports above the module body), so a
// module-level `new Anthropic()` would capture an empty key. Next.js loads env
// before modules, but lazy init keeps the engine correct in both contexts.
// Never inline the key.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

// Tuned to kill the usual AI-cold-email tells. The single most important
// rule is the last one: never invent a fact.
const SYSTEM = `You research a company and draft a single cold-outreach opener for a B2B sales rep.

Process:
1. Use web search to find ONE specific, recent, verifiable fact about the
   company: a funding round, a new product or feature, a hire or exec change,
   an expansion, a press mention, or a public job posting that signals a
   priority. Prefer the last 3-6 months.
2. Pick the role most likely to care about a sales rep's outreach
   (e.g. VP Sales, Head of RevOps, founder).
3. Write a 2-3 sentence opener built on that one fact.

The opener must read like a human peer wrote it in thirty seconds, not like
marketing. Hard rules:
- Open with the specific fact, stated plainly. Never "I came across",
  "I noticed", or "I saw that".
- No flattery. Cut "impressive", "exciting", "love what you're building".
- No "I hope this finds you well" or any greeting filler.
- One concrete observation, then one low-friction question or reason to reply.
  Nothing more.
- Use contractions. Short words. No three-item lists. No buzzwords
  (leverage, synergy, solution, robust, seamless, streamline).
- Don't pitch a product. Earn the reply first.
- Never invent a fact. If search turns up nothing specific and recent, say so
  in the signal field and write a plainer but still human opener.

Return ONLY a JSON object, with no other text before or after it:
{
  "companyName": "...",
  "signal": "the one fact you found, one sentence",
  "signalSource": "the URL you found it at, or empty string if none",
  "targetRole": "...",
  "opener": "the 2-3 sentence opener"
}`;

export type ProspectDraft = {
  companyName: string;
  signal: string;
  signalSource: string;
  targetRole: string;
  opener: string;
};

export async function researchAndDraft(
  company: string,
  website: string
): Promise<ProspectDraft> {
  const msg = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Company: ${company}\nWebsite: ${website}\n\nResearch this company and return the JSON object described in your instructions.`,
      },
    ],
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 3 },
    ],
  });

  // When the model uses web search, the response is a list of mixed content
  // blocks (server_tool_use, web_search_tool_result, text). Concatenate every
  // text block; ignore the tool-use / tool-result blocks.
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  // Defensive parse: strip code fences, grab the JSON object.
  const cleaned = text.replace(/```json|```/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(
      `No JSON found in model response. Raw text was:\n${text}`
    );
  }

  return JSON.parse(match[0]) as ProspectDraft;
}
