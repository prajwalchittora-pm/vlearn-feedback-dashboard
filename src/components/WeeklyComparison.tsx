import type { FeedbackEntry } from "../types";

interface Props {
  feedbacks: FeedbackEntry[];
  onBack: () => void;
  formatDateLabel: (date: string) => string;
}

interface WeekStats {
  label: string;
  dates: string[];
  totalSessions: number;
  totalResponses: number;
  avgRating: number;
  fiveStarPct: number;
  scoreDistribution: { score: number; count: number }[];
  courses: { name: string; avgRating: number; responses: number }[];
}

// Group sorted dates into weeks — dates within 3 days of each other go in the same week
function groupDatesIntoWeeks(dates: string[]): string[][] {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const weeks: string[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 3) {
      weeks[weeks.length - 1].push(sorted[i]);
    } else {
      weeks.push([sorted[i]]);
    }
  }
  return weeks;
}

function computeWeekStats(feedbacks: FeedbackEntry[], dates: string[], weekNum: number, formatDateLabel: (d: string) => string): WeekStats {
  const entries = feedbacks.filter((f) => dates.includes(f.date) && f.rating > 0);
  const allEntries = feedbacks.filter((f) => dates.includes(f.date));

  const totalSessions = new Set(allEntries.map((f) => f.sessionName)).size;
  const totalResponses = entries.length;
  const avgRating = totalResponses > 0 ? entries.reduce((s, f) => s + f.rating, 0) / totalResponses : 0;
  const fiveStarCount = entries.filter((f) => Math.round(f.rating) === 5).length;
  const fiveStarPct = totalResponses > 0 ? (fiveStarCount / totalResponses) * 100 : 0;

  const scoreDistribution = [1, 2, 3, 4, 5].map((score) => ({
    score,
    count: entries.filter((f) => Math.round(f.rating) === score).length,
  }));

  const courseMap: Record<string, { total: number; count: number }> = {};
  for (const f of entries) {
    const name = f.courseName || "Unknown";
    if (!courseMap[name]) courseMap[name] = { total: 0, count: 0 };
    courseMap[name].total += f.rating;
    courseMap[name].count += 1;
  }
  const courses = Object.entries(courseMap).map(([name, { total, count }]) => ({
    name,
    avgRating: count > 0 ? total / count : 0,
    responses: count,
  }));

  const label =
    dates.length === 1
      ? formatDateLabel(dates[0])
      : `${formatDateLabel(dates[0])} – ${formatDateLabel(dates[dates.length - 1])}`;

  return { label, dates, totalSessions, totalResponses, avgRating, fiveStarPct, scoreDistribution, courses };
}

function ratingColor(r: number) {
  if (r >= 4.5) return "var(--green)";
  if (r >= 3.5) return "var(--amber)";
  return "var(--red)";
}

function Delta({ curr, prev }: { curr: number; prev?: number }) {
  if (prev === undefined || prev === 0 || curr === 0) return null;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.01) return null;
  const up = diff > 0;
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color: up ? "#16a34a" : "#dc2626",
      background: up ? "#dcfce7" : "#fee2e2",
      padding: "2px 7px",
      borderRadius: 20,
      marginLeft: 6,
    }}>
      {up ? "▲" : "▼"} {up ? "+" : ""}{diff.toFixed(2)}
    </span>
  );
}

export function WeeklyComparison({ feedbacks, onBack, formatDateLabel }: Props) {
  const allDates = [...new Set(feedbacks.map((f) => f.date).filter(Boolean))];
  const weekGroups = groupDatesIntoWeeks(allDates);
  const weeks = weekGroups.map((dates, i) => computeWeekStats(feedbacks, dates, i + 1, formatDateLabel));

  const allCourses = [...new Set(feedbacks.filter((f) => f.rating > 0).map((f) => f.courseName).filter(Boolean))].sort();

  return (
    <div className="weekly-comparison">
      <div className="wc-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div>
          <h1>Week-by-Week Comparison</h1>
          <p className="wc-subtitle">{weeks.length} weeks of data</p>
        </div>
      </div>

      {/* Summary cards — one per week */}
      <div className="wc-week-grid">
        {weeks.map((week, i) => {
          const prev = i > 0 ? weeks[i - 1] : undefined;
          return (
            <div key={week.label} className="wc-week-card">
              <div className="wc-week-label">Week {i + 1}</div>
              <div className="wc-week-dates">{week.label}</div>

              <div className="wc-week-metrics">
                <div className="wc-week-metric">
                  <span className="wc-week-metric-value">{week.totalSessions}</span>
                  <span className="wc-week-metric-key">Sessions</span>
                </div>
                <div className="wc-week-metric">
                  <span className="wc-week-metric-value">{week.totalResponses}</span>
                  <span className="wc-week-metric-key">Responses</span>
                </div>
              </div>

              <div className="wc-rating-block">
                <span className="wc-rating-big" style={{ color: ratingColor(week.avgRating) }}>
                  {week.avgRating > 0 ? week.avgRating.toFixed(2) : "—"}
                </span>
                <span className="wc-rating-label">avg rating</span>
                <Delta curr={week.avgRating} prev={prev?.avgRating} />
              </div>

              <div className="wc-five-star-row">
                <span className="wc-five-star-pct">{week.fiveStarPct.toFixed(0)}%</span>
                <span className="wc-five-star-label"> gave 5★</span>
                <Delta curr={week.fiveStarPct} prev={prev?.fiveStarPct} />
              </div>

              {/* Score bar */}
              <div className="wc-score-bar-wrap">
                <div className="wc-score-bar">
                  {week.scoreDistribution.map(({ score, count }) => {
                    const pct = week.totalResponses > 0 ? (count / week.totalResponses) * 100 : 0;
                    const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];
                    return pct > 0 ? (
                      <div
                        key={score}
                        className="wc-score-segment"
                        title={`${score}★: ${count} (${pct.toFixed(0)}%)`}
                        style={{ width: `${pct}%`, background: colors[score - 1] }}
                      />
                    ) : null;
                  })}
                </div>
                <div className="wc-score-legend">
                  {week.scoreDistribution.map(({ score, count }) =>
                    count > 0 ? (
                      <span key={score} className="wc-score-legend-item">
                        {score}★ {count}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Course comparison table */}
      {allCourses.length > 0 && (
        <div className="wc-table-section">
          <h2 className="wc-section-title">Course-wise Avg Rating</h2>
          <div className="wc-table-wrapper">
            <table className="wc-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Course</th>
                  {weeks.map((w, i) => (
                    <th key={i}>Week {i + 1}<br /><span style={{ fontWeight: 400, textTransform: "none", fontSize: 11 }}>{w.label}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allCourses.map((course) => {
                  const cols = weeks.map((w) => w.courses.find((c) => c.name === course));
                  if (!cols.some((c) => c && c.responses > 0)) return null;
                  return (
                    <tr key={course}>
                      <td className="wc-course-name">{course}</td>
                      {cols.map((col, i) => {
                        const prevCol = i > 0 ? cols[i - 1] : undefined;
                        return (
                          <td key={i}>
                            {col && col.responses > 0 ? (
                              <div className="wc-td-inner">
                                <span style={{ fontWeight: 700, color: ratingColor(col.avgRating) }}>
                                  {col.avgRating.toFixed(2)}
                                </span>
                                <Delta curr={col.avgRating} prev={prevCol?.avgRating} />
                                <span className="wc-response-count">{col.responses} resp</span>
                              </div>
                            ) : (
                              <span className="wc-no-data">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
