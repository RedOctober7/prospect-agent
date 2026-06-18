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
- signalSource must be the direct URL of the specific article or press release
  where the fact appears. A URL containing /news, /newsroom, /press, or pointing
  to any index or listing page is a failure — return "" instead. Only return a
  URL if it links to the exact page that reports the fact.
- Build the opener on the single signal only. Do not introduce additional
  facts, context, or claims that the signal doesn't explicitly cover.
- Never ask for a meeting, call, or "quick conversation." End on one question
  about their situation, not about fit or next steps.
- Write like a sharp SDR who spent 30 seconds researching, not a consultant
  who spent an hour. Casual but intelligent.
- Maximum 3 sentences. Cut anything that doesn't need to be there.
- No industry jargon, analyst language, or MBA vocabulary. Plain words only.
  Banned: "de novo", "pull-through", "conversion play", "go-to-market motion",
  "headcount", "capacity", "operational lift". Use plain English equivalents.
- Vary sentence length. Short punchy sentences mix with one slightly longer one.
  Never three long sentences in a row.
- One small imperfection is fine — a slightly abrupt transition, a casual
  contraction. It should feel typed, not crafted.
- Never end on a generic open-ended question like "how are you handling X" or
  "what does your approach look like." End on a specific, slightly presumptuous
  question that assumes there's a problem — "where's that friction showing up"
  or "what's breaking first" rather than "how are you managing it."
- The opener should read like a Slack message from a smart peer, not a paragraph
  from a business analysis. If you read it out loud and it sounds like a
  presentation, rewrite it.
- Cut any sentence that explains the implication of the signal — the reader
  already knows their own business. State the fact, skip the explanation, go
  straight to the question.
- The question must name a specific thing that could be breaking, not ask how
  they're generally managing something. Bad: "How are you thinking about covering
  capacity?" Good: "Who's absorbing the IT work that's still on the roadmap?"

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

  // Defensive parse: strip code fences, then slice from the first { to the
  // last } so any text the model adds before or after the object is ignored.
  const cleaned = text.replace(/```json|```/g, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(
      `No JSON found in model response. Raw text was:\n${text}`
    );
  }

  return JSON.parse(cleaned.slice(first, last + 1)) as ProspectDraft;
}
