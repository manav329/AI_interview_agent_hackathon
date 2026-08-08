# AI Interview Agent

An AI-driven technical interview agent that conducts personalized interviews based on a candidate's cohort learning history.

## Overview

This project provides an intelligent backend for interviewing candidates by grounding the interview questions in real curriculum data and the candidate's specific background. It solves the problem of generic AI interviews by utilizing adaptive follow-ups and strict progression logic to ensure a comprehensive assessment. At the end of the session, the agent generates structured feedback highlighting the candidate's strengths, gaps, and recommended next steps.

## Live Demo

Live URL: [https://ai-interview-agent-hackathon.vercel.app/](https://ai-interview-agent-hackathon.vercel.app/)

*Note: This is an API-first project with an optional frontend UI available at the root URL.*

## Tech Stack

- **Framework**: Next.js (App Router), TypeScript
- **LLM Provider**: Groq (`llama-3.3-70b-versatile`)
- **Session Storage**: Upstash Redis (via Vercel Marketplace integration)
- **Hosting**: Vercel
- **Frontend**: React, standard CSS Modules (no Tailwind or external UI libraries)

## Architecture

The core of the application operates entirely through a single serverless endpoint (`POST /api/interview`). This simplifies the API surface, allowing a single route to handle initialization, conversational turns, and final feedback generation.

Because Vercel serverless functions do not retain memory between invocations, the application is entirely stateless. Conversation history and progress are persisted in an Upstash Redis database, keyed by a unique `sessionId`.

**High-Level Request Flow:**
1. **Initialization:** The request selects grounded topics from the curriculum and candidate data, building a tailored system prompt. The LLM generates the opening question, and a session is saved to Redis.
2. **Turn Processing:** Subsequent requests append the user's answer to the transcript. The LLM decides whether to ask a follow-up or move to a new topic (tracked via a specialized `<topic_day>` state injected into its response).
3. **Continuation:** Server-side logic forces the interview to continue until minimum question and distinct topic thresholds are met, overriding the LLM if it attempts to end prematurely.
4. **Completion:** Once thresholds are met, the LLM signals the end of the interview. A separate, low-temperature LLM call is then dispatched to evaluate the transcript and produce structured JSON feedback.

```text
[Client] -> POST /api/interview 
             |
             +-> [New Session?] -> Build Prompt -> Groq LLM -> Save Session -> Return Q1
             |
             +-> [Existing Session?] -> Load Session -> Groq LLM -> Topic Check -> Save Session -> Return Next Q
             |
             +-> [Done?] -> Groq LLM (Low Temp) -> Generate Structured JSON Feedback -> Return Feedback
```

## File Structure

```text
/app
  /api/interview/route.ts — the single required API endpoint handling all LLM interactions
  layout.tsx — Next.js layout component
  page.tsx — frontend entry point (React UI)
  page.module.css — frontend styling
/lib
  data.ts — candidate/curriculum data access
  prompt.ts — system + feedback prompt builders
  session.ts — Upstash-backed session persistence logic
  types.ts — shared TypeScript types
/data
  candidates.json — mock candidate profiles and learning history
  curriculum.json — mock cohort curriculum topics
/scripts
  integration-test.ts — end-to-end interview flow test
.env.local.example — template for required environment variables
```

## Prerequisites

- Node.js 20+
- npm
- A free [Groq API key](https://console.groq.com)
- A free Upstash Redis database (provisioned via Vercel Marketplace, or standalone at [Upstash](https://upstash.com))
- A [Vercel](https://vercel.com) account (for deployment; not required to run locally)

## Installation & Local Setup

1. Clone the repo and `cd` into it:
   ```bash
   git clone <repo-url>
   cd AI_interview_agent_hackathon
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```
4. Fill in the required environment variables in `.env.local` (see [Environment Variables](#environment-variables)).
5. Run the dev server:
   ```bash
   npm run dev
   ```
6. Open your browser to `http://localhost:3000`

## Environment Variables

| Variable | Description | Where to get it |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Key for authenticating LLM requests | [Groq Console](https://console.groq.com) |
| `KV_URL` | Upstash Redis connection string | Vercel Dashboard -> Storage |
| `KV_REST_API_URL` | Upstash REST API URL | Vercel Dashboard -> Storage |
| `KV_REST_API_TOKEN` | Upstash REST API token for read/write | Vercel Dashboard -> Storage |
| `KV_REST_API_READ_ONLY_TOKEN`| Upstash REST API token (read-only) | Vercel Dashboard -> Storage |

## Running Locally — Commands Reference

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on localhost:3000 |
| `npm run build` | Compiles and builds the Next.js application for production |
| `npm run start` | Starts the Next.js production server (requires a prior build) |

## API Contract

The `POST /api/interview` endpoint adapts its behavior based on the request payload.

### Start Interview

**Request:**
```json
POST /api/interview
{
  "sessionId": "unique-uuid-123",
  "candidate": {
    "member": {
      "id": "cand_1",
      "name": "Jane Doe"
    }
  }
}
```

**Response:**
```json
{
  "reply": "Hello Jane, are you ready to begin our technical discussion?",
  "done": false,
  "questionCount": 1,
  "currentDay": 3
}
```

### Conversation Turn

**Request:**
```json
POST /api/interview
{
  "sessionId": "unique-uuid-123",
  "message": "I would use a hash map to achieve O(1) lookups."
}
```

**Response:**
```json
{
  "reply": "That's a great approach. What are the memory tradeoffs?",
  "done": false,
  "questionCount": 2,
  "currentDay": 3
}
```

### Interview Complete

When the LLM signals the end of the interview (and minimum thresholds are met), the response includes the final feedback payload:

**Response:**
```json
{
  "reply": "Interview completed.",
  "done": true,
  "feedback": {
    "summary": "Jane demonstrated a strong grasp of algorithmic concepts...",
    "strengths": ["Clear communication", "Understanding of Big-O"],
    "gaps": ["System design scalability"],
    "next": ["Review distributed systems concepts"]
  }
}
```

### Error Responses

| Status | When | Example Body |
| :--- | :--- | :--- |
| 400 | Missing `sessionId`, `message`, or `candidate` object, or invalid JSON | `{ "error": "Invalid request shape..." }` |
| 404 | Unknown or expired `sessionId` | `{ "error": "Session not found or has expired" }` |
| 405 | Method is not POST | `{ "error": "This endpoint only accepts POST" }` |
| 409 | Duplicate session creation attempt | `{ "error": "Session already exists..." }` |
| 429 | Upstream Groq rate limits hit | `{ "error": "Rate limit exceeded. Please retry shortly." }` |
| 500 | Missing env vars or internal error | `{ "error": "Server misconfigured..." }` |
| 504 | LLM request timeout (> 25s) | `{ "error": "LLM request timed out..." }` |

## Usage Guide (How to Use the App)

### Using the Frontend UI
1. Navigate to the root URL (e.g., `http://localhost:3000`).
2. Select a candidate from the dropdown menu (e.g., "Jane Doe — Backend Engineer").
3. Click "Start Interview" to initialize the session.
4. Read the interviewer's question and type your conversational response into the input box.
5. Continue answering questions back-and-forth. The system will guide you through multiple distinct topics based on the candidate's curriculum.
6. Once the interview concludes, you will be presented with a structured feedback screen detailing strengths, gaps, and next steps.

### Using the API (cURL)

**1. Start the interview:**
```bash
curl -X POST http://localhost:3000/api/interview \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "candidate": {
      "member": { "id": "user_2f3V7" }
    }
  }'
```

**2. Reply to the question:**
```bash
curl -X POST http://localhost:3000/api/interview \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "message": "I would implement rate limiting using a token bucket algorithm."
  }'
```

*(Repeat step 2 until the `done` boolean in the response returns `true` and yields the `feedback` object).*

## Testing

The project includes an integration test script that verifies the end-to-end interview flow, checking question counts, distinct topic coverage, follow-up detection, and final feedback shape.

To run the test:
```bash
npx tsx scripts/integration-test.ts
```

## Deployment

To deploy your own copy to Vercel:

1. Push your local repository to GitHub.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click "Add New..." -> "Project".
3. Import your GitHub repository.
4. Go to the **Storage** tab in your Vercel project and provision a new **Upstash Redis** database.
5. Go to your project's **Settings -> Environment Variables** and add your `GROQ_API_KEY`. (The `KV_*` variables will be automatically added by the Upstash integration).
6. Click **Deploy**.

## Design Decisions / Notes

- **Stateless Serverless Execution:** Session state lives in Upstash Redis rather than in-memory. This ensures compatibility with Vercel's serverless edge/lambda environments, where memory isn't preserved between POST requests.
- **Explicit Topic Tracking:** The LLM is instructed to output a hidden `<topic_day>X</topic_day>` tag. We extract this on the server instead of trusting the LLM to remember what topics it covered, preventing hallucinations or repetitive loops.
- **Hard-Coded Guardrails:** If the LLM tries to output `END_INTERVIEW` before minimum time/topic thresholds are met, the server intervenes, catches the response, and overrides the LLM with an explicit command to ask another question.
- **Separate Feedback Call:** Generating structured JSON is done in a separate LLM call with a much lower temperature (`0.2`). This decouples the creative, conversational phase from the rigid, structured feedback phase.

## Out of Scope

- Voice interaction
- User authentication and login
- Persistent user accounts
- Long-term interview history/dashboarding
- Mobile applications

## Submission Note

*Note: The curriculum and candidate data provided in this project are synthetic, intended for hackathon demonstration purposes, and do not represent real user data.*