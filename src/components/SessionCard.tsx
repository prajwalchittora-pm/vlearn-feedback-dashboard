import type { SessionSummary } from "../types";
import { StarRating } from "./StarRating";

interface Props {
  session: SessionSummary;
  onClick: () => void;
}

export function SessionCard({ session, onClick }: Props) {
  return (
    <div className="session-card" onClick={onClick}>
      {session.feedbacks[0]?.courseName && (
        <span className="session-card-course">{session.feedbacks[0].courseName}</span>
      )}
      <h3 className="session-card-title">{session.sessionName}</h3>
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
      {session.feedbacks[0]?.date && (
        <div className="session-card-date">{session.feedbacks[0].date}</div>
      )}
    </div>
  );
}
