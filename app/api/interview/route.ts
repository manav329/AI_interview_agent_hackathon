import { NextResponse } from 'next/server';
import { getCandidateById, selectInterviewTopics, getCurriculum } from '@/lib/data';
import { buildSystemPrompt, buildFeedbackPrompt } from '@/lib/prompt';
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
        return NextResponse.json({ 
          reply: 'Interview completed.', 
          done: true, 
          feedback: session.feedback 
        });
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

      let llmReply = '';

      if (!session.coveredDays) {
        session.coveredDays = [];
      }

      if (session.questionCount > 14) {
        llmReply = 'END_INTERVIEW';
      } else {
        const instruction = `The exact current questionCount so far: ${session.questionCount}.
The exact list of distinct days covered so far: [${session.coveredDays.join(', ')}].
You MUST NOT respond with END_INTERVIEW unless questionCount is already at least 8 AND at least 4 distinct days have been covered. If either condition is not yet met, you MUST ask another question, either a follow-up on an already-covered topic or a question on a new uncovered topic from the provided topic list.
CRITICAL INSTRUCTION: You must include [Day X] in your response (where X is the day number of the topic you are addressing) so the system can track covered days.`;

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

        llmReply = completion.choices[0]?.message?.content?.trim() || '';

        let isEnding = llmReply.toUpperCase() === 'END_INTERVIEW';

        if (isEnding && (session.questionCount < 8 || session.coveredDays.length < 4)) {
          console.warn(`[Override] LLM attempted to end interview early (QCount: ${session.questionCount}, Days: ${session.coveredDays.length}). Forcing a new question.`);
          
          const overrideMessages: any[] = [
            ...messages,
            { role: 'assistant', content: llmReply },
            { role: 'user', content: `You attempted to end the interview, but you are not allowed to yet. As a reminder, questionCount is ${session.questionCount} and you need 8. Covered days is ${session.coveredDays.length} and you need 4. You MUST ask a genuine next question. Do not end the interview. Remember to include [Day X] in your response.` }
          ];

          const overrideCompletion = await groq.chat.completions.create({
            messages: overrideMessages,
            model: 'llama-3.3-70b-versatile',
          });

          llmReply = overrideCompletion.choices[0]?.message?.content?.trim() || '';
        }
      }

      if (llmReply.toUpperCase() === 'END_INTERVIEW') {
        const feedbackPrompt = buildFeedbackPrompt(session.transcript, session.topics);
        const feedbackCompletion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: feedbackPrompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2
        });

        let rawFeedback = feedbackCompletion.choices[0]?.message?.content?.trim() || '{}';
        let parsedFeedback;

        try {
          parsedFeedback = JSON.parse(rawFeedback);
        } catch (e) {
          rawFeedback = rawFeedback.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
          try {
            parsedFeedback = JSON.parse(rawFeedback);
          } catch (e2) {
            parsedFeedback = {};
          }
        }

        const feedback = {
          summary: typeof parsedFeedback.summary === 'string' ? parsedFeedback.summary : '',
          strengths: Array.isArray(parsedFeedback.strengths) ? parsedFeedback.strengths : [],
          gaps: Array.isArray(parsedFeedback.gaps) ? parsedFeedback.gaps : [],
          next: Array.isArray(parsedFeedback.next) ? parsedFeedback.next : []
        };

        session.done = true;
        session.feedback = feedback;
        await saveSession(session);

        return NextResponse.json({ reply: 'Interview completed.', done: true, feedback });
      } else {
        const dayMatch = llmReply.match(/\[Day\s*(\d+)\]/i);
        if (dayMatch) {
          const day = parseInt(dayMatch[1], 10);
          if (!session.coveredDays.includes(day)) {
            session.coveredDays.push(day);
          }
          llmReply = llmReply.replace(dayMatch[0], '').trim();
        }

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
        { role: 'user', content: 'Please produce a warm opening message and the first interview question as ONE message. Start now. CRITICAL INSTRUCTION: You must include [Day X] in your response (where X is the day number of the topic you are addressing) so the system can track covered days.' }
      ],
      model: 'llama-3.3-70b-versatile',
    });

    let reply = completion.choices[0]?.message?.content?.trim() || 'Hello, are you ready to begin?';
    let initialCoveredDays: number[] = [];
    const dayMatch = reply.match(/\[Day\s*(\d+)\]/i);
    if (dayMatch) {
      initialCoveredDays.push(parseInt(dayMatch[1], 10));
      reply = reply.replace(dayMatch[0], '').trim();
    }

    let session;
    try {
      session = await createSession(sessionId, fullCandidate.member.id, topics);
    } catch (error: any) {
      return NextResponse.json({ error: 'Session already exists. Use a new sessionId or send a follow-up "message".' }, { status: 409 });
    }

    session.transcript.push({ role: 'interviewer', content: reply });
    session.questionCount = 1;
    session.coveredDays = initialCoveredDays;
    await saveSession(session);

    return NextResponse.json({ reply, done: false });
  } catch (error: any) {
    console.error('Error starting interview:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
