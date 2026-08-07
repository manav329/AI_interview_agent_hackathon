# AI_interview_agent_hackathon

## Setting up Upstash Redis
To provision a free Upstash Redis database and link it to this project:
1. Go to your project on the Vercel dashboard.
2. Navigate to the **Storage** tab (or **Marketplace** -> **Storage**).
3. Select **KV (Upstash Redis)** and follow the prompts to create a new database.
4. Once created and linked, Vercel will automatically populate the required `KV_*` environment variables for your deployments.
5. For local development, use `vercel env pull .env.local` to download these variables into your local `.env.local` file.