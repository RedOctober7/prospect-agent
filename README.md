# Prospect Agent

Researches a company with Claude's web search, finds one specific recent
signal (funding, a hire, a product launch, ...), and drafts a 2–3 sentence
cold outreach opener built on that single fact. Also has a "signals" mode
that scores a list of companies (recency / trigger strength / specificity)
without drafting an opener, for prioritizing who to reach out to first.

## Stack

- Next.js (App Router) + TypeScript, Tailwind CSS
- Prisma + PostgreSQL (Supabase)
- Anthropic SDK (`claude-sonnet-4-6`, web search tool)
- Zod for validating the model's JSON output

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment variables** — copy the example file and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   - `ANTHROPIC_API_KEY` — from the Anthropic Console. Web search must be
     enabled for your org.
   - `DATABASE_URL` / `DIRECT_URL` — Supabase Postgres connection strings.
     `DATABASE_URL` is the pooled connection (port 6543, `?pgbouncer=true`),
     used at runtime. `DIRECT_URL` is the direct connection (port 5432),
     used by `prisma migrate`. Get both from Supabase's Project Settings →
     Connect → ORM tab.
   - `APP_BASIC_AUTH_USER` / `APP_BASIC_AUTH_PASSWORD` — gates the whole
     app (UI + API routes) behind HTTP Basic Auth so a shared/scraped URL
     can't burn your Anthropic budget. Leave both empty for local dev.
     **Before any real deploy, set both** and generate the password
     locally rather than hardcoding one:
     ```bash
     node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
     ```

3. **Run migrations**
   ```bash
   npm run prisma:migrate
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   ```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run draft -- "Company" "website.com"` | Run the research+draft engine standalone from the terminal, no UI/DB. Prints the JSON result to stdout. |
| `npm run prisma:migrate` | Run Prisma migrations against `.env.local` |
| `npm run prisma:push` | Push the schema without creating a migration (quick local iteration) |

## Deploying (Vercel)

- Mirror every var from `.env.local` into the Vercel project's environment
  variables — `DATABASE_URL`, `DIRECT_URL`, `ANTHROPIC_API_KEY`,
  `APP_BASIC_AUTH_USER`, `APP_BASIC_AUTH_PASSWORD`.
- Basic Auth is enforced by `proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) and runs automatically once both `APP_BASIC_AUTH_*`
  vars are set — no extra Vercel config needed.
- A research call can run up to 3 web searches per company; the API
  routes set `maxDuration = 60` to give it room.

## Notes

- The `Prospect` table is intentionally a single flat table (see the
  comment in `prisma/schema.prisma`) — resist normalizing it for v1.
- `signalSource` is whatever URL the model returns from its research; it's
  only rendered as a clickable link when it parses as `http(s)` (see
  `isHttpUrl` in `app/draft-form.tsx`).
