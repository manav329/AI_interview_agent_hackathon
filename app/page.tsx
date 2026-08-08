"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import candidatesData from '../data/candidates.json';

type View = 'START' | 'CHAT' | 'FEEDBACK';

type ChatMessage = {
  role: 'user' | 'interviewer';
  text: string;
};

type Feedback = {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
};

function ProjectGuide() {
  return (
    <div className={styles.guideWrapper}>
      <div className={styles.guideContainer}>

        <div className={styles.guideSection}>
          <h2 className={styles.guideHeading}>What This Is</h2>
          <p className={styles.guideText}>
            An AI-driven technical interview agent that conducts personalized interviews based on a candidate's cohort progress. It exposes a single <span className={styles.guideCodeInline}>POST /api/interview</span> endpoint.
          </p>
        </div>

        <div className={styles.guideSection}>
          <h2 className={styles.guideHeading}>Tech Stack</h2>
          <ul className={styles.guideList}>
            <li>Next.js (TypeScript)</li>
            <li>Groq (LLM)</li>
            <li>Upstash Redis via Vercel (session storage)</li>
            <li>Deployed on Vercel</li>
          </ul>
        </div>

        <div className={styles.guideSection}>
          <h2 className={styles.guideHeading}>Clone & Run Locally</h2>
          <ol className={styles.guideList}>
            <li>Clone the repository:
              <div className={styles.guideCodeBlock}>git clone {'<repo-url>'}</div>
            </li>
            <li>Enter the project directory:
              <div className={styles.guideCodeBlock}>cd AI_interview_agent_hackathon</div>
            </li>
            <li>Install dependencies:
              <div className={styles.guideCodeBlock}>npm install</div>
            </li>
            <li>Copy the environment template:
              <div className={styles.guideCodeBlock}>cp .env.local.example .env.local</div>
            </li>
            <li>Get a free Groq key and provision Upstash via Vercel Marketplace, then fill in <span className={styles.guideCodeInline}>.env.local</span>.</li>
            <li>Start the local server:
              <div className={styles.guideCodeBlock}>npm run dev</div>
            </li>
            <li>Open <a href="http://localhost:3000" className={styles.guideLink} target="_blank" rel="noreferrer">http://localhost:3000</a></li>
          </ol>
        </div>

        <div className={styles.guideSection}>
          <h2 className={styles.guideHeading}>Environment Variables Required</h2>
          <ul className={styles.guideList}>
            <li><span className={styles.guideCodeInline}>GROQ_API_KEY</span>: From Groq console</li>
            <li><span className={styles.guideCodeInline}>KV_URL</span>: From Vercel Upstash integration</li>
            <li><span className={styles.guideCodeInline}>KV_REST_API_URL</span>: From Vercel Upstash integration</li>
            <li><span className={styles.guideCodeInline}>KV_REST_API_TOKEN</span>: From Vercel Upstash integration</li>
            <li><span className={styles.guideCodeInline}>KV_REST_API_READ_ONLY_TOKEN</span>: From Vercel Upstash integration</li>
          </ul>
        </div>

        <div className={styles.guideSection}>
          <h2 className={styles.guideHeading}>API Contract</h2>
          <p className={styles.guideText}><strong>Start Interview</strong></p>
          <div className={styles.guideCodeBlock}>
            {`POST /api/interview
{ "sessionId": "uuid", "candidate": { ... } }

-> { "reply": "...", "done": false }`}
          </div>
          <p className={styles.guideText}><strong>Next Turn</strong></p>
          <div className={styles.guideCodeBlock}>
            {`POST /api/interview
{ "sessionId": "uuid", "message": "answer" }

-> { "reply": "...", "done": false }`}
          </div>
          <p className={styles.guideText}><strong>End Interview</strong></p>
          <div className={styles.guideCodeBlock}>
            {`POST /api/interview
{ "sessionId": "uuid", "message": "answer" }

-> { "reply": "...", "done": true, "feedback": { ... } }`}
          </div>
        </div>

        <div className={styles.guideSection}>
          <h2 className={styles.guideHeading}>Deploying Your Own Copy</h2>
          <ol className={styles.guideList}>
            <li>Push your code to GitHub.</li>
            <li>Connect the repository to a new project in Vercel.</li>
            <li>Provision Upstash Redis via the Vercel Marketplace and link it to your project.</li>
            <li>Add <span className={styles.guideCodeInline}>GROQ_API_KEY</span> in Vercel's Environment Variables settings.</li>
            <li>Deploy to production.</li>
          </ol>
        </div>

        <div className={styles.guideSection}>
          <h2 className={styles.guideHeading}>Live Demo</h2>
          <p className={styles.guideText}>
            <a href="https://ai-interview-agent-hackathon.vercel.app/" className={styles.guideLink} target="_blank" rel="noreferrer">https://ai-interview-agent-hackathon.vercel.app/</a>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('START');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');

  // Session & Chat State
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  // Feedback State
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleStartInterview = async () => {
    if (!selectedCandidateId) return;

    setError(null);
    setIsLoading(true);

    const candidate = candidatesData.candidates.find(c => c.member.id === selectedCandidateId);
    if (!candidate) {
      setError('Candidate not found.');
      setIsLoading(false);
      return;
    }

    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          candidate: candidate
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start interview');
      }

      setMessages([{ role: 'interviewer', text: data.reply }]);
      setQuestionCount(data.questionCount || 1);
      setView('CHAT');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessage
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      if (data.done) {
        setFeedback(data.feedback);
        setView('FEEDBACK');
      } else {
        setMessages(prev => [...prev, { role: 'interviewer', text: data.reply }]);
        if (data.questionCount) {
          setQuestionCount(data.questionCount);
        } else {
          setQuestionCount(prev => prev + 1);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error sending message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setView('START');
    setSelectedCandidateId('');
    setSessionId('');
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    setError(null);
    setQuestionCount(0);
    setFeedback(null);
  };

  return (
    <div className={styles.container}>
      {/* SIDEBAR */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Sidebar"
        >
          <span className={styles.sidebarToggleText}>
            {sidebarOpen ? 'Close Guide' : 'Project Guide'}
          </span>
        </button>
        <div className={styles.sidebarContent}>
          {sidebarOpen && <ProjectGuide />}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.main}>
        {view === 'START' && (
          <div className={styles.panel}>
            <h1 className={styles.title}>AI Interview Agent</h1>

            <select
              className={styles.select}
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
            >
              <option value="">Select a candidate...</option>
              {candidatesData.candidates.map((c) => (
                <option key={c.member.id} value={c.member.id}>
                  {c.member.name} — {c.member.jobRole}
                </option>
              ))}
            </select>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.btn}
              onClick={handleStartInterview}
              disabled={!selectedCandidateId || isLoading}
            >
              {isLoading ? 'Initializing...' : 'Start Interview'}
            </button>
          </div>
        )}

        {view === 'CHAT' && (
          <div className={styles.chatContainer}>
            <div className={styles.chatHeader}>
              Question {questionCount}
            </div>

            <div className={styles.messageList}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageInterviewer}`}
                >
                  {msg.text}
                </div>
              ))}
              {isLoading && (
                <div className={styles.typingIndicator}>
                  typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && <div className={styles.inlineError}>{error}</div>}

            <form className={styles.inputArea} onSubmit={handleSendMessage}>
              <input
                type="text"
                className={styles.input}
                placeholder="Type your answer..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send"
              >
                <svg className={styles.arrowIcon} viewBox="0 0 24 24">
                  <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {view === 'FEEDBACK' && feedback && (
          <div className={styles.feedbackContainer}>
            <div className={styles.panel} style={{ maxWidth: '100%' }}>
              <h1 className={styles.title}>Interview Complete</h1>
              <p className={styles.feedbackSummary}>{feedback.summary}</p>

              <div className={styles.feedbackSection}>
                <h3>Strengths</h3>
                <ul className={styles.feedbackList}>
                  {feedback.strengths.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.feedbackSection}>
                <h3 className={styles.gapsLabel}>Gaps</h3>
                <ul className={styles.feedbackList}>
                  {feedback.gaps.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.feedbackSection}>
                <h3>Next Steps</h3>
                <ul className={styles.feedbackList}>
                  {feedback.next.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <button className={styles.btn} onClick={resetState}>
                Start New Interview
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
