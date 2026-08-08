# AI Usage Log

This log documents all AI-assisted development on the AI Interview Agent project, in chronological order. Each entry reflects a real prompt/session used during development — not a retroactive summary.

**Tools used:**
- **Antigravity** — AI coding assistant, used to generate and modify all actual project code (every step in the original build guide, plus follow-up fixes).
- **Claude** — used to plan the overall step-by-step build guide, draft the exact prompts subsequently pasted into Antigravity, and diagnose/debug issues from raw terminal errors and test output during development.

---

| # | Date | Tool | Prompt Summary | Files Affected | Notes |
|---|------|------|-----------------|-----------------|-------|
| 1 | 2026-08-08 | Claude | Drafted the full step-by-step build guide (Steps 0-11) covering project scaffolding through Vercel deployment, with a dedicated Antigravity prompt, explanation, and test plan for each step | N/A (planning) | Produced as a markdown guide before any code was written |
| 2 | 2026-08-08 | Antigravity | Scaffolded Next.js + TypeScript project structure for Vercel serverless deployment, including a single API route stub and bundled curriculum/candidate JSON data | `app/api/interview/route.ts` (stub), `package.json`, `tsconfig.json`, `data/curriculum.json`, `data/candidates.json`, `.gitignore` | Prompt sourced from Step 0 of the Claude-authored guide |
| 3 | 2026-08-08 | Antigravity | Built typed data-access utilities to load curriculum/candidate JSON and select interview topics based on candidate mission history (passed/skipped/attempts) | `lib/types.ts`, `lib/data.ts` | Prompt sourced from Step 1 of the guide; verified with a scratch test script confirming ≥4 distinct days selected and skipped missions included |
| 4 | 2026-08-08 | Claude | Provided step-by-step instructions for writing and running a scratch test script to validate `selectInterviewTopics` output against real candidate data | `scratch/test-step1.ts` (throwaway, not committed) | Manual cross-referencing against `data/candidates.json` |
| 5 | 2026-08-08 | Antigravity | Designed system prompt builder for the interviewer persona, grounded in real curriculum objectives and candidate signals; designed feedback-generation prompt | `lib/prompt.ts` | Prompt sourced from Step 2 of the guide |
| 6 | 2026-08-08 | Claude | Provided step-by-step instructions for a scratch script to print and manually review the generated system and feedback prompts | `scratch/test-step2.ts` (throwaway, not committed) | Manual read-through of prompt output for topic/objective accuracy |
| 7 | 2026-08-08 | Antigravity | Added session persistence using Upstash Redis (via Vercel Marketplace) to handle serverless statelessness across requests | `lib/session.ts`, `.env.local.example` | Prompt sourced from Step 3 of the guide |
| 8 | 2026-08-08 | Claude | Diagnosed a Vercel Marketplace provisioning conflict (`REDIS_URL` collision from an initial Redis Cloud integration) and provided steps to disconnect it and re-provision with Upstash for Redis specifically, using a custom `KV` env var prefix | N/A (Vercel project config) | Resolved before `@vercel/kv` could be used correctly |
| 9 | 2026-08-08 | Antigravity | Implemented "start interview" branch of POST /api/interview: candidate lookup, topic selection, opening LLM call, session creation | `app/api/interview/route.ts` | Prompt sourced from Step 4 of the guide |
| 10 | 2026-08-08 | Claude | Diagnosed an `invalid_api_key` 500 error via a standalone Groq/Upstash connectivity test script, isolating the fault to a malformed `GROQ_API_KEY` | `test-apis.ts` (standalone diagnostic script) | Root cause: env var likely copied with extraneous characters; resolved by regenerating the key at console.groq.com |
| 11 | 2026-08-08 | Antigravity | Implemented "conversation turn" branch: transcript append, follow-up vs next-topic LLM decision, question count tracking | `app/api/interview/route.ts` | Prompt sourced from Step 5 of the guide |
| 12 | 2026-08-08 | Claude | Diagnosed a `ReferenceError: getSession is not defined` from a dev-server stack trace and identified the missing import in the route handler | `app/api/interview/route.ts` | Fixed by adding `getSession`/`saveSession` to the existing import statement |
| 13 | 2026-08-08 | Antigravity | Implemented end-of-interview branch: structured feedback generation, JSON parsing with fallback, idempotent repeat-request handling | `app/api/interview/route.ts` | Prompt sourced from Step 6 of the guide |
| 14 | 2026-08-08 | Claude | Diagnosed a premature-termination bug (interview ending after ~3 questions instead of the required 8+/4 topics) and drafted an Antigravity fix prompt: added explicit question/topic-count state to every turn's prompt plus a server-side override forcing continuation until minimums are met | `app/api/interview/route.ts`, `lib/session.ts` | Root cause: model had no numeric awareness of its own progress |
| 15 | 2026-08-08 | Antigravity | Applied the above fix: added a hidden `<topic_day>` marker to LLM responses, parsed server-side into `session.coveredDays`, with a forced-continuation override when minimums aren't met | `app/api/interview/route.ts`, `lib/session.ts` | Prompt drafted by Claude, executed via Antigravity |
| 16 | 2026-08-08 | Claude | Diagnosed a topic-plateau bug from integration test output (`coveredDays` stuck at 2) and drafted a follow-up Antigravity fix prompt: explicitly list covered vs. uncovered topics in every turn's prompt and force progression after repeated same-day questions | `app/api/interview/route.ts` | Verified via integration script: distinct days covered increased from 0 → 2 → 4+ across iterations |
| 17 | 2026-08-08 | Antigravity | Built integration test script simulating a full interview end-to-end, asserting question count, distinct days, follow-up occurrence, and feedback shape | `scripts/integration-test.ts` | Prompt sourced from Step 7 of the guide; used throughout subsequent debugging to catch regressions |
| 18 | 2026-08-08 | Antigravity | Hardened API error handling: try/catch wrapper, missing-env-var checks, malformed-body guard, LLM call timeout, Groq 429 handling, GET-method rejection | `app/api/interview/route.ts` | Prompt sourced from Step 8 of the guide; verified via curl for 400/405/404/429/500 responses |
| 19 | 2026-08-08 | Claude | Diagnosed PowerShell-specific `curl` aliasing issues (`Invoke-WebRequest` parameter errors) throughout testing and provided corrected `curl.exe`-based command syntax | N/A (tooling/environment, no project files) | Recurring issue across multiple testing steps; resolved by always invoking `curl.exe` explicitly |
| 20 | 2026-08-08 | Antigravity | Prepared deployment: README, .gitignore verification, vercel.json timeout config, AI usage log scaffold | `README.md`, `vercel.json`, `.env.local.example`, `AI_USAGE_LOG.md` | Prompt sourced from Step 9 of the guide |
| 21 | 2026-08-08 | Claude | Diagnosed a Vercel "Not authorized" CLI error and an "invalid Root Directory" deployment error; provided resolution steps (re-login, relink via `.vercel` folder removal, GitHub-triggered deploy as fallback) | N/A (Vercel project config) | Deployment ultimately succeeded via GitHub-connected auto-deploy |
| 22 | 2026-08-08 | Antigravity | Deployed to Vercel; connected GitHub repository for automatic deployments on push | N/A (Vercel project config) | Prompt sourced from Step 10 of the guide |
| 23 | 2026-08-08 | Claude | Provided a full live-URL test plan mirroring Steps 4-8, adapted for the deployed production endpoint instead of localhost | N/A (testing only) | Confirmed Upstash-backed session state persists correctly across separate serverless invocations in production |
| 24 | 2026-08-08 | Antigravity | Generated frontend UI mockups (candidate selector, chat interface, feedback screen, sidebar) per a custom color palette and design constraints, then built the selected concept | `app/page.tsx`, `app/layout.tsx`, `components/*`, `app/globals.css` | Mockup-first workflow: visual concepts reviewed before any UI code was generated; prompt drafted by Claude |
| 25 | 2026-08-08 | Antigravity | Built "Project Guide" sidebar panel with setup, environment variable, API contract, and deployment documentation | `components/ProjectGuide.tsx` (or equivalent) | Prompt drafted by Claude; scoped to stay concise and scannable rather than a full README dump |

---

## How this log was maintained

Entries were added incrementally during development, immediately after each Antigravity session that produced or modified code — not written retroactively at submission time. Dates reflect actual working sessions.

## Notes

- All curriculum and candidate data used are the synthetic files provided for this hackathon.
- LLM provider: Groq (free tier, no cost incurred).
- Session storage: Upstash Redis via Vercel Marketplace (free tier).
