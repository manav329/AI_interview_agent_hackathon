import { kv } from '@vercel/kv';
import { CurriculumDay } from './types';

export interface SessionState {
  sessionId: string;
  candidateId: string;
  topics: CurriculumDay[];
  transcript: { role: 'interviewer' | 'candidate'; content: string }[];
  questionCount: number;
  coveredDays: number[];
  done: boolean;
  feedback?: {
    summary: string;
    strengths: string[];
    gaps: string[];
    next: string[];
  };
}

export async function createSession(sessionId: string, candidateId: string, topics: CurriculumDay[]): Promise<SessionState> {
  const key = `interview:session:${sessionId}`;
  
  const existing = await kv.get<SessionState>(key);
  if (existing) {
    throw new Error(`Session with ID ${sessionId} already exists.`);
  }

  const session: SessionState = {
    sessionId,
    candidateId,
    topics,
    transcript: [],
    questionCount: 0,
    coveredDays: [],
    done: false
  };

  await kv.set(key, session, { ex: 24 * 60 * 60 });
  return session;
}

export async function getSession(sessionId: string): Promise<SessionState | null> {
  const key = `interview:session:${sessionId}`;
  return await kv.get<SessionState>(key);
}

export async function saveSession(state: SessionState): Promise<void> {
  const key = `interview:session:${state.sessionId}`;
  await kv.set(key, state, { ex: 24 * 60 * 60 });
}
