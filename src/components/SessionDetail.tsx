import type { SessionSummary } from "../types";
import { StarRating } from "./StarRating";
import { ScoreChart } from "./ScoreChart";
import { SessionInsights } from "./SessionInsights";

interface Props {
  session: SessionSummary;
  onBack: () => void;
}

export function SessionDetail({ session, onBack }: Props) {
  return (
    <div className="session-detail">
      <button className="btn-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Sessions
      </button>

      <div className="detail-header">
        <h2>{session.sessionName}</h2>
        {session.feedbacks[0]?.date && (
          <span className="detail-date">{session.feedbacks[0].date}</span>
        )}
      </div>

      <div className="detail-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <span className="summary-value">{session.averageRating.toFixed(1)}</span>
            <span className="summary-label">Average Rating</span>
            <StarRating rating={session.averageRating} />
          </div>
          <div className="summary-card">
            <span className="summary-value">{session.totalResponses}</span>
            <span className="summary-label">Total Responses</span>
          </div>
        </div>
        <ScoreChart distribution={session.scoreDistribution} />
      </div>

      <SessionInsights feedbacks={session.feedbacks} sessionName={session.sessionName} />

      <div className="feedback-table-wrapper">
        <h3>Learner Feedback</h3>
        <table className="feedback-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Learner Name</th>
              <th>Email</th>
              <th>Rating</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {session.feedbacks.map((fb, i) => (
              <tr key={i}>
                <td className="row-num">{i + 1}</td>
                <td className="learner-name">{fb.learnerName}</td>
                <td className="learner-email">{fb.email}</td>
                <td className="learner-rating">
                  <StarRating rating={fb.rating} />
                </td>
                <td className="learner-comment">{fb.comment || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
