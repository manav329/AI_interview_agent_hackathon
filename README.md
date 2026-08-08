# AI Interview Agent

An automated, LLM-powered mock interview application that evaluates candidates against a 14-day curriculum.

## Architecture & Tech Stack

- **Framework**: Next.js (App Router)
- **Deployment**: Vercel Serverless
- **LLM Provider**: [Groq](https://groq.com/) (Free tier, no credit card required) using `llama-3.3-70b-versatile`
- **Session Store**: Upstash Redis (Free tier via Vercel KV)

This project has zero required costs and can be run entirely on free-tier services.

## API Contract

The core endpoint is a `POST` request to `/api/interview`.

### Valid Request Shapes

**1. Starting a New Interview**
```json
{
  "sessionId": "unique-session-123",
  "candidate": {
    "member": {
      "id": "candidate-456",
      "name": "Jane Doe",
      "jobRole": "Software Engineer",
      "yearsExperience": 2,
      "education": "B.S. Computer Science",
      "status": "Active"
    }
  }
}
```

**2. Sending a Message**
```json
{
  "sessionId": "unique-session-123",
  "message": "My answer to your question is..."
}
```

### Responses
- `200 OK`: Valid reply containing the LLM's response, `done` boolean, and `questionCount`. If `done` is true, it includes a `feedback` object.
- `400 Bad Request`: If the JSON body is invalid or missing both `candidate` and `message`.
- `404 Not Found`: If an ongoing session is not found or has expired.
- `405 Method Not Allowed`: If a `GET` request is made.
- `409 Conflict`: If trying to start an interview with an existing `sessionId`.
- `429 Too Many Requests`: If the Groq rate limit is exceeded.
- `500 Internal Server Error`: If there is a missing environment variable or server crash.
- `504 Gateway Timeout`: If the LLM provider fails to respond within 25 seconds.

## Environment Variables

Create a `.env.local` file at the root with the following variables:

```env
# Groq API key for the LLM
GROQ_API_KEY="gsk_..."

# Vercel KV / Upstash Redis variables
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="AbCd..."
```

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Pull your Vercel KV environment variables (if linked to a Vercel project):
   ```bash
   vercel env pull .env.local
   ```
3. Add your `GROQ_API_KEY` to `.env.local`.
4. Start the development server:
   ```bash
   npm run dev
   ```

## Setting up Upstash Redis
To provision a free Upstash Redis database and link it to this project:
1. Go to your project on the Vercel dashboard.
2. Navigate to the **Storage** tab (or **Marketplace** -> **Storage**).
3. Select **KV (Upstash Redis)** and follow the prompts to create a new database.
4. Once created and linked, Vercel will automatically populate the required `KV_*` environment variables for your deployments.
5. For local development, use `vercel env pull .env.local` to download these variables into your local `.env.local` file.

## Deployment

Deploy this project directly to Vercel:

1. Push your repository to GitHub.
2. Import the project in Vercel.
3. In the Vercel dashboard, add the `GROQ_API_KEY` environment variable.
4. Set up the Vercel KV database as described above.
5. Deploy. The `vercel.json` file is configured to allow up to a 30s timeout for the interview endpoint.