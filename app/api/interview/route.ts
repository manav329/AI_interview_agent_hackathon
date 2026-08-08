import { NextResponse } from 'next/server';
import { getCandidateById, selectInterviewTopics, getCurriculum } from '@/lib/data';
import { buildSystemPrompt } from '@/lib/prompt';
import { createSession, saveSession, getSession } from '@/lib/session';
import Groq from 'groq-sdk';
import { Candidate } from '@/lib/types';

export async function GET() {
  return NextResponse.json({ message: 'Interview API ready.' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.message !== undefined) {
      const { sessionId, message } = body;

      if (!sessionId || typeof sessionId !== 'string' || !message || typeof message !== 'string') {
        return NextResponse.json({ error: 'sessionId and message must be non-empty strings' }, { status: 400 });
      }

      const session = await getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found or has expired' }, { status: 404 });
      }

      if (session.done) {
        return NextResponse.json({ error: 'Interview is already finished' }, { status: 400 });
      }

      session.transcript.push({ role: 'candidate', content: message });

      const candidate = getCandidateById(session.candidateId);
      const candidateToUse = candidate || {
        member: { id: session.candidateId, name: 'Candidate', jobRole: 'Candidate', yearsExperience: 0, education: 'N/A', status: '' },
        missions: [],
        signals: { commitDays: 0, missionsCompleted: 0, missionsFirstTry: 0 }
      };

      const systemPrompt = buildSystemPrompt(candidateToUse, session.topics);

      const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });

      const instruction = "Based on the candidate's last answer, either ask a natural follow-up on the same topic, or transition to the next uncovered topic. Ask exactly one question. If you have now asked at least 8 questions total across at least 4 topics and covered what you need, do not ask a new question — instead respond only with the literal token END_INTERVIEW.";

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...session.transcript.map(turn => ({
          role: turn.role === 'interviewer' ? 'assistant' : 'user',
          content: turn.content
        })),
        { role: 'system', content: instruction }
      ];

      const completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
      });

      const llmReply = completion.choices[0]?.message?.content?.trim() || '';

      if (llmReply.toUpperCase() === 'END_INTERVIEW') {
        // Fallback end-of-interview logic.
        // NOTE: Awaiting clarification on what the actual Step 6 end-of-interview logic is.
        session.done = true;
        await saveSession(session);
        return NextResponse.json({ reply: 'Interview complete.', done: true });
      } else {
        session.transcript.push({ role: 'interviewer', content: llmReply });
        session.questionCount += 1;
        await saveSession(session);
        return NextResponse.json({ reply: llmReply, done: false });
      }
    }

    const { sessionId, candidate } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId must be a non-empty string' }, { status: 400 });
    }

    if (!candidate || !candidate.member || !candidate.member.id) {
      return NextResponse.json({ error: 'candidate must include member.id' }, { status: 400 });
    }

    const fullCandidate = getCandidateById(candidate.member.id) || candidate as Candidate;
    const curriculum = getCurriculum();
    const topics = selectInterviewTopics(fullCandidate, curriculum);
    const systemPrompt = buildSystemPrompt(fullCandidate, topics);

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please produce a warm opening message and the first interview question as ONE message. Start now.' }
      ],
      model: 'llama-3.3-70b-versatile',
    });

    const reply = completion.choices[0]?.message?.content || 'Hello, are you ready to begin?';

    let session;
    try {
      session = await createSession(sessionId, fullCandidate.member.id, topics);
    } catch (error: any) {
      return NextResponse.json({ error: 'Session already exists. Use a new sessionId or send a follow-up "message".' }, { status: 409 });
    }

    session.transcript.push({ role: 'interviewer', content: reply });
    session.questionCount = 1;
    await saveSession(session);

    return NextResponse.json({ reply, done: false });
  } catch (error: any) {
    console.error('Error starting interview:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
