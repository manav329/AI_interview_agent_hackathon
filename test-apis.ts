/**
 * Standalone connectivity test — checks Groq and Upstash independently,
 * with zero app logic involved. Run this BEFORE testing your actual endpoint.
 *
 * Usage:
 *   1. Place this file in your project root (or /scratch).
 *   2. npm install groq-sdk @vercel/kv   (if not already installed)
 *   3. npx tsx test-apis.ts
 */

import Groq from "groq-sdk";
import { kv } from "@vercel/kv";

async function testGroq() {
  console.log("\n--- Testing Groq API ---");
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Say 'hello' and nothing else." }],
      max_tokens: 10,
    });
    const reply = completion.choices[0]?.message?.content;
    console.log("PASS — Groq responded:", reply);
  } catch (err: any) {
    console.log("FAIL — Groq error:", err?.message || err);
  }
}

async function testUpstash() {
  console.log("\n--- Testing Upstash KV ---");
  try {
    const testKey = `healthcheck:${Date.now()}`;
    await kv.set(testKey, { ok: true, ts: Date.now() }, { ex: 60 }); // expires in 60s
    const value = await kv.get(testKey);
    console.log("PASS — Upstash wrote and read back:", value);
    await kv.del(testKey);
    console.log("Cleaned up test key.");
  } catch (err: any) {
    console.log("FAIL — Upstash error:", err?.message || err);
  }
}

async function checkEnvVars() {
  console.log("--- Checking env vars are present (not validating values) ---");
  const required = [
    "GROQ_API_KEY",
    "KV_URL",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "KV_REST_API_READ_ONLY_TOKEN",
  ];
  for (const key of required) {
    const val = process.env[key];
    console.log(`${key}: ${val ? `present (${val.slice(0, 6)}...)` : "MISSING"}`);
  }
}

async function main() {
  await checkEnvVars();
  await testGroq();
  await testUpstash();
  console.log("\nDone. If both show PASS, your endpoint's 500 error is in your route logic, not the external APIs.");
}

main();
