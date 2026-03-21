import { useEffect, useState } from "react";
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

export function ExecutiveSummary({ feedbacks, reportDate, onBack }: Props) {
  const [data, setData] = useState<ExecData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbacks, reportDate }),
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

      {loading && (
        <div className="ai-loading" style={{ justifyContent: "center", padding: "60px" }}>
          <div className="spinner" />
          <span>Generating executive summary...</span>
        </div>
      )}

      {error && (
        <div className="ai-error">
          <span>{error}</span>
          <button onClick={fetchSummary}>Retry</button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Executive Summary */}
          <div className="exec-card">
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
