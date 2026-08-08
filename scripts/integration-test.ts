import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000/api/interview';

// Canned answers to simulate a candidate
const CANNED_ANSWERS = [
  "I have extensive experience with embeddings. They are dense vector representations of data, usually text, that capture semantic meaning. I used them extensively with cosine similarity for a search feature.",
  "I'm not completely sure, could you clarify what you mean?",
  "I've used vector databases like Pinecone and Milvus to store embeddings and perform fast nearest-neighbor searches. We indexed the data using HNSW which gave us a great balance of speed and recall.",
  "I guess we just put the data in a database and queried it with some SQL?",
  "For prompt engineering, I typically use techniques like few-shot prompting and chain-of-thought to guide the LLM to more reliable and structured outputs. I've also implemented dynamic few-shot example selection using RAG.",
  "I built a Retrieval-Augmented Generation pipeline using LangChain, where we first retrieved relevant documents, injected them into the context window, and then generated a grounded response.",
  "I've worked with function calling to force the LLM to output structured JSON matching a specific schema, which we then used to trigger backend APIs.",
  "Well, I think agents are just scripts that run in the background, but I haven't really built any complex ones.",
  "For multi-agent orchestration, I used LangGraph to manage state across multiple specialized agents, where each agent had a specific role like researcher, writer, and reviewer.",
  "I've deployed our models using Docker containers on a Kubernetes cluster to handle scaling automatically based on traffic."
];

function getRandomAnswer(turnIndex: number): string {
  // Use weak answers on specific turns to encourage follow-ups
  if (turnIndex === 2 || turnIndex === 5) {
    return CANNED_ANSWERS.find(a => a.includes('not completely sure') || a.includes('guess we just put')) || CANNED_ANSWERS[1];
  }
  return CANNED_ANSWERS[turnIndex % CANNED_ANSWERS.length];
}

async function runTest() {
  console.log('Starting Integration Test...');

  // 1. Pick a candidate
  const candidatesPath = path.resolve(process.cwd(), 'data', 'candidates.json');
  const candidatesData = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
  const candidate = candidatesData.candidates[0];

  console.log(`Selected Candidate: ${candidate.member.name} (${candidate.member.id})`);

  const sessionId = `test-session-${Date.now()}`;
  let questionCount = 0;
  let coveredDays = new Set<number>();
  let previousDay: number | null = null;
  let hasFollowUp = false;
  let finalFeedback: any = null;

  // 2. Start Request
  console.log(`\n--- Turn 0 (Start) ---`);
  let res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, candidate })
  });

  if (!res.ok) {
    console.error('Failed to start interview:', await res.text());
    process.exit(1);
  }

  let data = await res.json();
  console.log(`Interviewer: ${data.reply}`);
  
  if (data.currentDay !== null && data.currentDay !== undefined) {
    coveredDays.add(data.currentDay);
    previousDay = data.currentDay;
  }
  if (data.questionCount) {
    questionCount = data.questionCount;
  }

  // 3. Loop turns
  const maxTurns = 20;
  let turns = 0;

  while (!data.done && turns < maxTurns) {
    turns++;
    console.log(`\n--- Turn ${turns} ---`);

    const answer = getRandomAnswer(turns);
    console.log(`Candidate: ${answer}`);

    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: answer })
    });

    if (!res.ok) {
      console.error(`Failed on turn ${turns}:`, await res.text());
      process.exit(1);
    }

    data = await res.json();
    console.log(`Interviewer: ${data.reply || 'No reply (Done)'}`);

    if (data.done) {
      finalFeedback = data.feedback;
      break;
    }

    if (data.currentDay !== null && data.currentDay !== undefined) {
      coveredDays.add(data.currentDay);
      if (previousDay === data.currentDay) {
        hasFollowUp = true;
        console.log(`[!] Follow-up detected on Day ${data.currentDay}`);
      }
      previousDay = data.currentDay;
    }

    if (data.questionCount) {
      questionCount = data.questionCount;
    }
  }

  console.log('\n--- Test Completed ---');
  console.log(`Total turns: ${turns}`);
  console.log(`Final Question Count: ${questionCount}`);
  console.log(`Distinct Days Covered: ${Array.from(coveredDays).join(', ')}`);
  console.log(`Follow-up Occurred: ${hasFollowUp}`);
  console.log('Feedback:', JSON.stringify(finalFeedback, null, 2));

  // 5. Assertions
  const errors: string[] = [];

  if (questionCount < 8) {
    errors.push(`Expected at least 8 questions, got ${questionCount}`);
  }
  
  if (coveredDays.size < 4) {
    errors.push(`Expected at least 4 distinct days covered, got ${coveredDays.size}`);
  }

  if (!hasFollowUp) {
    errors.push('Expected at least one follow-up (two consecutive turns on the same topic), but none occurred.');
  }

  if (!finalFeedback) {
    errors.push('Expected final feedback object, got null/undefined.');
  } else {
    if (!finalFeedback.summary || finalFeedback.summary.trim() === '') errors.push('Feedback missing summary.');
    if (!Array.isArray(finalFeedback.strengths) || finalFeedback.strengths.length === 0) errors.push('Feedback missing strengths.');
    if (!Array.isArray(finalFeedback.gaps) || finalFeedback.gaps.length === 0) errors.push('Feedback missing gaps.');
    if (!Array.isArray(finalFeedback.next) || finalFeedback.next.length === 0) errors.push('Feedback missing next steps.');
  }

  // 6. Report and Exit
  if (errors.length > 0) {
    console.error('\n❌ INTEGRATION TEST FAILED:');
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
  } else {
    console.log('\n✅ INTEGRATION TEST PASSED!');
    process.exit(0);
  }
}

runTest().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
