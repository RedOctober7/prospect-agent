// Phase 1 — the engine in a terminal, no UI, no DB.
//   npm run draft -- "Notion" "notion.so"
// Loads .env.local so ANTHROPIC_API_KEY is available to a standalone tsx run
// (Next loads it automatically; a bare script does not).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { researchAndDraft } from "../lib/research";

async function main() {
  const [company, website] = process.argv.slice(2);

  if (!company) {
    console.error('Usage: npm run draft -- "Company Name" "website.com"');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and fill it in."
    );
    process.exit(1);
  }

  console.error(`Researching ${company}${website ? ` (${website})` : ""}...`);

  const draft = await researchAndDraft(company, website ?? "");

  // The JSON object on stdout is the whole point of Phase 1.
  console.log(JSON.stringify(draft, null, 2));
}

main().catch((err) => {
  console.error("\nDraft failed:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
