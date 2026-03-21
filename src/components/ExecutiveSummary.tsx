import { useEffect, useState, useMemo } from "react";
import type { FeedbackEntry } from "../types";

interface IssueBucket {
  category: string;
  count: number;
  sessions: string[];
  summary: string;
}

interface Escalation {
  session: string;
  issue: string;
  learnerQuote: string;
  severity: "high" | "critical";
}

interface StandoutFeedback {
  session: string;
  learner: string;
  quote: string;
  whyNotable: string;
}

interface SessionFlag {
  session: string;
  avgRating: number;
  reason: string;
}

interface ExecData {
  executiveSummary: string;
  overallSentiment: "positive" | "mixed" | "negative";
  topHighlights: string[];
  criticalEscalations: Escalation[];
  issueBuckets: IssueBucket[];
  standoutPositiveFeedback: StandoutFeedback[];
  sessionsNeedingAttention: SessionFlag[];
  sessionsExcelling: SessionFlag[];
  actionItems: string[];
}

interface Props {
  feedbacks: FeedbackEntry[];
  reportDate: string;
  onBack: () => void;
}

const PROGRESS_STEPS = [
  { label: "Aggregating session data...", duration: 800 },
  { label: "Analyzing feedback patterns...", duration: 2500 },
  { label: "Categorizing issues...", duration: 3000 },
  { label: "Identifying critical escalations...", duration: 2000 },
  { label: "Generating executive summary...", duration: 4000 },
  { label: "Finalizing report...", duration: 2000 },
];

function ProgressScreen() {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let totalTime = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < PROGRESS_STEPS.length; i++) {
      totalTime += PROGRESS_STEPS[i].duration;
      timers.push(setTimeout(() => setStep(i + 1), totalTime));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const progressPercent = Math.min(
    (step / PROGRESS_STEPS.length) * 100,
    95
  );

  const currentLabel =
    step < PROGRESS_STEPS.length
      ? PROGRESS_STEPS[step].label
      : "Almost done...";

  const elapsedSec = Math.floor(elapsed / 1000);

  return (
    <div className="exec-progress">
      <div className="exec-progress-card">
        <div className="exec-progress-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h3>Generating Executive Summary</h3>
        <p className="exec-progress-subtitle">
          Analyzing {">"}250 feedback entries across all sessions
        </p>

        <div className="exec-progress-bar-track">
          <div
            className="exec-progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="exec-progress-step">{currentLabel}</p>

        <div className="exec-progress-steps">
          {PROGRESS_STEPS.map((_, i) => (
            <div
              key={i}
              className={`exec-step-dot ${i < step ? "done" : i === step ? "active" : ""}`}
            />
          ))}
        </div>

        <p className="exec-progress-time">{elapsedSec}s elapsed</p>
      </div>
    </div>
  );
}

export function ExecutiveSummary({ feedbacks, reportDate, onBack }: Props) {
  const [data, setData] = useState<ExecData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pre-aggregate feedback into compact session digests
  const { sessions, totalFeedbacks, overallAvg } = useMemo(() => {
    const map: Record<string, FeedbackEntry[]> = {};
    for (const f of feedbacks) {
      if (!map[f.sessionName]) map[f.sessionName] = [];
      map[f.sessionName].push(f);
    }

    const sessions = Object.entries(map).map(([name, fbs]) => {
      const avg = fbs.reduce((s, f) => s + f.rating, 0) / fbs.length;
      const distribution = [1, 2, 3, 4, 5].map(
        (score) => fbs.filter((f) => Math.round(f.rating) === score).length
      );
      // Only send non-empty comments to reduce payload
      const comments = fbs
        .filter((f) => f.comment && f.comment.trim().length > 2)
        .map((f) => ({ learner: f.learnerName, rating: f.rating, text: f.comment }));

      return {
        name,
        course: fbs[0].courseName || "",
        avg,
        total: fbs.length,
        distribution,
        comments,
      };
    });

    const total = feedbacks.length;
    const avg = feedbacks.reduce((s, f) => s + f.rating, 0) / total;

    return { sessions, totalFeedbacks: total, overallAvg: avg };
  }, [feedbacks]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions, reportDate, totalFeedbacks, overallAvg }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error || `Server error (${res.status})`
        );
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totalSessions = new Set(feedbacks.map((f) => f.sessionName)).size;
  const avgRating = feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length;

  const sentimentColor =
    data?.overallSentiment === "positive"
      ? "var(--green)"
      : data?.overallSentiment === "negative"
        ? "var(--red)"
        : "var(--amber)";

  if (loading) {
    return (
      <div className="exec-summary">
        <button className="btn-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Sessions
        </button>
        <ProgressScreen />
      </div>
    );
  }

  return (
    <div className="exec-summary">
      <button className="btn-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Sessions
      </button>

      <div className="exec-header">
        <h2>Executive Summary</h2>
        <span className="exec-date">{reportDate}</span>
      </div>

      {/* Quick stats */}
      <div className="exec-stats">
        <div className="exec-stat-card">
          <span className="exec-stat-value">{totalSessions}</span>
          <span className="exec-stat-label">Sessions</span>
        </div>
        <div className="exec-stat-card">
          <span className="exec-stat-value">{feedbacks.length}</span>
          <span className="exec-stat-label">Responses</span>
        </div>
        <div className="exec-stat-card">
          <span className="exec-stat-value">{avgRating.toFixed(1)}</span>
          <span className="exec-stat-label">Avg Rating</span>
        </div>
        {data && (
          <div className="exec-stat-card">
            <span className="exec-stat-value" style={{ color: sentimentColor, textTransform: "capitalize" }}>
              {data.overallSentiment}
            </span>
            <span className="exec-stat-label">Sentiment</span>
          </div>
        )}
      </div>

      {error && (
        <div className="ai-error">
          <span>{error}</span>
          <button onClick={fetchSummary}>Retry</button>
        </div>
      )}

      {data && (
        <>
          {/* Executive Summary */}
          <div className="exec-card exec-card-glow">
            <p className="exec-summary-text">{data.executiveSummary}</p>
          </div>

          {/* Critical Escalations */}
          {data.criticalEscalations.length > 0 && (
            <div className="exec-card exec-escalations">
              <h3>
                <span className="exec-icon">!</span>
                Critical Escalations ({data.criticalEscalations.length})
              </h3>
              <div className="exec-escalation-list">
                {data.criticalEscalations.map((esc, i) => (
                  <div key={i} className={`escalation-item severity-${esc.severity}`}>
                    <div className="escalation-header">
                      <span className={`severity-badge badge-${esc.severity}`}>
                        {esc.severity}
                      </span>
                      <span className="escalation-session">{esc.session}</span>
                    </div>
                    <p className="escalation-issue">{esc.issue}</p>
                    {esc.learnerQuote && (
                      <blockquote className="escalation-quote">
                        "{esc.learnerQuote}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issue Buckets */}
          {data.issueBuckets.length > 0 && (
            <div className="exec-card">
              <h3>Issue Categories</h3>
              <div className="bucket-grid">
                {data.issueBuckets
                  .sort((a, b) => b.count - a.count)
                  .map((bucket, i) => (
                    <div key={i} className="bucket-item">
                      <div className="bucket-header">
                        <span className="bucket-name">{bucket.category}</span>
                        <span className="bucket-count">{bucket.count}</span>
                      </div>
                      <p className="bucket-summary">{bucket.summary}</p>
                      <div className="bucket-sessions">
                        {bucket.sessions.map((s, j) => (
                          <span key={j} className="bucket-session-tag">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Two-column: Sessions needing attention + excelling */}
          <div className="exec-two-col">
            {data.sessionsNeedingAttention.length > 0 && (
              <div className="exec-card exec-attention">
                <h3>Sessions Needing Attention</h3>
                {data.sessionsNeedingAttention.map((s, i) => (
                  <div key={i} className="session-flag-item">
                    <div className="session-flag-header">
                      <span className="session-flag-name">{s.session}</span>
                      <span className="session-flag-rating rating-low">
                        {s.avgRating.toFixed(1)}/5
                      </span>
                    </div>
                    <p className="session-flag-reason">{s.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {data.sessionsExcelling.length > 0 && (
              <div className="exec-card exec-excelling">
                <h3>Top Performing Sessions</h3>
                {data.sessionsExcelling.map((s, i) => (
                  <div key={i} className="session-flag-item">
                    <div className="session-flag-header">
                      <span className="session-flag-name">{s.session}</span>
                      <span className="session-flag-rating rating-high">
                        {s.avgRating.toFixed(1)}/5
                      </span>
                    </div>
                    <p className="session-flag-reason">{s.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Highlights */}
          {data.topHighlights.length > 0 && (
            <div className="exec-card">
              <h3>Top Highlights</h3>
              <ul className="exec-highlights">
                {data.topHighlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Standout Positive Feedback */}
          {data.standoutPositiveFeedback.length > 0 && (
            <div className="exec-card exec-positive-quotes">
              <h3>Standout Learner Feedback</h3>
              {data.standoutPositiveFeedback.map((fb, i) => (
                <div key={i} className="positive-quote-item">
                  <blockquote>"{fb.quote}"</blockquote>
                  <div className="positive-quote-meta">
                    <span className="positive-quote-learner">— {fb.learner}</span>
                    <span className="positive-quote-session">{fb.session}</span>
                  </div>
                  <p className="positive-quote-why">{fb.whyNotable}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action Items */}
          {data.actionItems.length > 0 && (
            <div className="exec-card exec-actions">
              <h3>Recommended Actions</h3>
              <ol className="exec-action-list">
                {data.actionItems.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
}
