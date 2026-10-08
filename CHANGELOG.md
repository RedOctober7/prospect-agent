# Changelog

## October 2026

- **Code quality:** the draft and signal calls share one research
  function and one block of search rules, so the search rules can't drift
  apart between the two prompts (the prompt text the model gets is
  unchanged). Signal scores must be whole numbers from 1 to 5, and the
  total is computed from them instead of taken from the model. Error
  messages shown in the app no longer include the model's raw reply (it
  goes to the server log). README reorganized for a first-time reader;
  this changelog moved out of it
  ([#18](https://github.com/RedOctober7/prospect-agent/pull/18)).
- **Supabase keep-alive:** a Vercel Cron route reads the database three
  times a day so the free-tier project is less likely to be paused, gated
  by `CRON_SECRET` ([#17](https://github.com/RedOctober7/prospect-agent/pull/17)).
- **Layout:** 16px between signals-table columns, so hostnames like
  `globenewswire.com` fit on one line
  ([#17](https://github.com/RedOctober7/prospect-agent/pull/17)).
- **Docs + layout:** README rewritten (how the research works, sign-in,
  troubleshooting, new screenshots). In the signals table, long source
  hostnames wrap at a dot instead of pushing the table past the page
  width, and the "· M failed" count matches the collapsed search list
  ([#16](https://github.com/RedOctober7/prospect-agent/pull/16)).
- **Research quality**, tuned on real runs:
  - Openers no longer tell the reader what their own job has become
    ([#15](https://github.com/RedOctober7/prospect-agent/pull/15)).
  - The switch to the basic web search tool, which made runs about 2.5×
    faster ([#14](https://github.com/RedOctober7/prospect-agent/pull/14),
    [#15](https://github.com/RedOctober7/prospect-agent/pull/15)).
  - Recency before trigger strength
    ([#13](https://github.com/RedOctober7/prospect-agent/pull/13)).
  - Up to 5 searches, with repeats shown once
    ([#12](https://github.com/RedOctober7/prospect-agent/pull/12)).
  - Each search's outcome in the trace and the server logs
    ([#11](https://github.com/RedOctober7/prospect-agent/pull/11)).
  - Varied searches, the strongest trigger, one role, absolute dates
    ([#10](https://github.com/RedOctober7/prospect-agent/pull/10)).
  - The model gets today's date, so it stopped drafting on year-old news
    as if it were fresh ([#9](https://github.com/RedOctober7/prospect-agent/pull/9)).
- **Sign-in:** a styled sign-in page with a session cookie and sign out,
  replacing the browser's Basic Auth prompt
  ([#8](https://github.com/RedOctober7/prospect-agent/pull/8)).
- **Deploy fixes:** `prisma generate` runs in the build, which fixed the
  500 on Vercel ([#6](https://github.com/RedOctober7/prospect-agent/pull/6)).
  Install scripts are approved via `allowScripts` for npm 12
  ([#7](https://github.com/RedOctober7/prospect-agent/pull/7)).
- **UI:** light/dark theme with WCAG AA contrast, new fonts, the research
  trace, hostname source links, the elapsed counter, a better mobile
  layout, README screenshots, and the `AGENTS.md`/`CLAUDE.md` files
  `next dev` writes ([#5](https://github.com/RedOctober7/prospect-agent/pull/5)).
  Long target roles wrap in the signals table
  ([#9](https://github.com/RedOctober7/prospect-agent/pull/9)).
- **Model:** research moved to `claude-sonnet-5-5` with explicit effort
  and room for thinking, and a refusal now shows its own error
  ([#3](https://github.com/RedOctober7/prospect-agent/pull/3)). Added
  the server-side refusal fallback, bumping `@anthropic-ai/sdk` 0.104 →
  0.131 ([#4](https://github.com/RedOctober7/prospect-agent/pull/4)).
- **Docs:** README brought up to date
  ([#2](https://github.com/RedOctober7/prospect-agent/pull/2)).

## August 2026

- **Security, pagination, edit/delete, CI and tests**
  ([#1](https://github.com/RedOctober7/prospect-agent/pull/1)): the app
  behind HTTP Basic Auth, the model's JSON validated with Zod, source
  links rendered only for `http(s)` URLs, web search moved to
  `web_search_20260209` (replaced by the basic tool in October),
  cursor-paginated saved prospects with status tracking, edit and delete,
  batch dedup and retry, ESLint, and GitHub Actions CI with the first unit
  tests.
- CI's push trigger fixed to run on `master` (it pointed at `main`).
- Fixed a duplicate row when Retry was double-clicked in batch/signals.

## June 2026

- First version: the research + draft engine with prompt rules tuned on
  real companies (no jargon, no explanation sentences, sharper closing
  questions, varied structure), the Prospect table, batch input with
  per-row loading states, a dark UI, and the Signals ranking mode with CSV
  export.
