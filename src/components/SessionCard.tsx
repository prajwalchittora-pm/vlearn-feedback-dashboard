import type { SessionSummary } from "../types";
import { StarRating } from "./StarRating";

interface Props {
  session: SessionSummary;
  onClick: () => void;
}

export function SessionCard({ session, onClick }: Props) {
  const hasFeedback = session.totalResponses > 0;

  return (
    <div className={`session-card ${!hasFeedback ? "session-card-empty" : ""}`} onClick={hasFeedback ? onClick : undefined}>
      {session.feedbacks[0]?.courseName && (
        <span className="session-card-course">{session.feedbacks[0].courseName}</span>
      )}
      <h3 className="session-card-title">{session.sessionName}</h3>
      {hasFeedback ? (
        <div className="session-card-stats">
          <div className="session-card-rating">
            <StarRating rating={session.averageRating} />
          </div>
          <div className="session-card-responses">
            <span className="responses-count">{session.totalResponses}</span>
            <span className="responses-label">
              {session.totalResponses === 1 ? "response" : "responses"}
            </span>
          </div>
        </div>
      ) : (
        <div className="session-card-awaiting">
          <span className="awaiting-badge">Awaiting Feedback</span>
          <span className="awaiting-desc">No learner responses yet</span>
        </div>
      )}
      {session.feedbacks[0]?.date && (
        <div className="session-card-date">{session.feedbacks[0].date}</div>
      )}
    </div>
  );
}
