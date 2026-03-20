import { useState } from "react";
import type { SessionSummary } from "../types";
import { SessionCard } from "./SessionCard";

interface Props {
  sessions: SessionSummary[];
  onSelectSession: (session: SessionSummary) => void;
  onReset: () => void;
}

export function SessionList({ sessions, onSelectSession, onReset }: Props) {
  const [search, setSearch] = useState("");

  const filtered = sessions.filter((s) =>
    s.sessionName.toLowerCase().includes(search.toLowerCase())
  );

  const totalFeedbacks = sessions.reduce((sum, s) => sum + s.totalResponses, 0);
  const overallAvg =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.averageRating, 0) / sessions.length
      : 0;

  return (
    <div className="session-list">
      <div className="session-list-header">
        <div className="header-top">
          <h1>VLearn Feedback Dashboard</h1>
          <button className="btn-secondary" onClick={onReset}>
            Upload New CSV
          </button>
        </div>
        <div className="overview-stats">
          <div className="stat-pill">
            <span className="stat-value">{sessions.length}</span>
            <span className="stat-label">Sessions</span>
          </div>
          <div className="stat-pill">
            <span className="stat-value">{totalFeedbacks}</span>
            <span className="stat-label">Total Feedbacks</span>
          </div>
          <div className="stat-pill">
            <span className="stat-value">{overallAvg.toFixed(1)}</span>
            <span className="stat-label">Avg Rating</span>
          </div>
        </div>
        <div className="search-wrapper">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No sessions found matching "{search}"</p>
        </div>
      ) : (
        <div className="session-grid">
          {filtered.map((session) => (
            <SessionCard
              key={session.sessionName}
              session={session}
              onClick={() => onSelectSession(session)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
