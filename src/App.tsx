import { useState, useEffect, useMemo } from "react";
import type { FeedbackEntry, SessionSummary } from "./types";
import { parseCSV, groupBySession } from "./utils/csvParser";
import { CsvUploader } from "./components/CsvUploader";
import { SessionList } from "./components/SessionList";
import { SessionDetail } from "./components/SessionDetail";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import { WeeklyComparison } from "./components/WeeklyComparison";
import "./App.css";

type View = "loading" | "upload" | "list" | "detail" | "executive" | "weekly";

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function App() {
  const [view, setView] = useState<View>("loading");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const allFeedbacks = useMemo(
    () => sessions.flatMap((s) => s.feedbacks),
    [sessions]
  );

  const uniqueDates = useMemo(() => {
    const dates = [...new Set(allFeedbacks.map((f) => f.date).filter(Boolean))];
    dates.sort();
    return dates;
  }, [allFeedbacks]);

  const filteredSessions = useMemo(() => {
    if (dateFilter === "all") return sessions;
    return sessions
      .map((s) => {
        const filtered = s.feedbacks.filter((f) => f.date === dateFilter);
        if (filtered.length === 0) return null;
        const totalRating = filtered.reduce((sum, f) => sum + f.rating, 0);
        const scoreDistribution = [1, 2, 3, 4, 5].map((score) => ({
          score,
          count: filtered.filter((f) => Math.round(f.rating) === score).length,
        }));
        return {
          ...s,
          feedbacks: filtered,
          totalResponses: filtered.length,
          averageRating: totalRating / filtered.length,
          scoreDistribution,
        };
      })
      .filter(Boolean) as SessionSummary[];
  }, [sessions, dateFilter]);

  const filteredFeedbacks = useMemo(
    () => filteredSessions.filter((s) => s.totalResponses > 0).flatMap((s) => s.feedbacks),
    [filteredSessions]
  );

  const reportDate = useMemo(() => {
    if (dateFilter !== "all") return formatDateLabel(dateFilter);
    const dates = allFeedbacks.map((f) => f.date).filter(Boolean);
    return dates[0] || "";
  }, [allFeedbacks, dateFilter]);

  // Auto-load the bundled feedback report on startup
  useEffect(() => {
    async function loadDefault() {
      try {
        const response = await fetch("/default-feedback.csv");
        if (!response.ok) throw new Error("No default data found");
        const blob = await response.blob();
        const file = new File([blob], "report-20260322.csv", {
          type: "text/csv",
        });
        const entries: FeedbackEntry[] = await parseCSV(file);
        const grouped = groupBySession(entries);
        setSessions(grouped);
        setFileName("report-20260322.csv");
        setView("list");
      } catch {
        setView("upload");
      }
    }
    loadDefault();
  }, []);

  const handleFileSelected = async (file: File) => {
    try {
      setError(null);
      setFileName(file.name);
      const entries: FeedbackEntry[] = await parseCSV(file);
      const grouped = groupBySession(entries);
      setSessions(grouped);
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV file");
    }
  };

  const handleSelectSession = (session: SessionSummary) => {
    setSelectedSession(session);
    setView("detail");
  };

  const handleBack = () => {
    setSelectedSession(null);
    setView("list");
  };

  const handleReset = () => {
    setSessions([]);
    setSelectedSession(null);
    setFileName("");
    setView("upload");
  };

  if (view === "loading") {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading feedback data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {view === "upload" && <CsvUploader onFileSelected={handleFileSelected} />}

      {view === "list" && (
        <SessionList
          sessions={filteredSessions}
          onSelectSession={handleSelectSession}
          onReset={handleReset}
          onExecutiveSummary={() => setView("executive")}
          onWeeklyComparison={() => setView("weekly")}
          dateFilter={dateFilter}
          uniqueDates={uniqueDates}
          onDateFilterChange={setDateFilter}
          formatDateLabel={formatDateLabel}
        />
      )}

      {view === "detail" && selectedSession && (
        <SessionDetail session={selectedSession} onBack={handleBack} />
      )}

      {view === "executive" && (
        <ExecutiveSummary
          feedbacks={filteredFeedbacks}
          reportDate={reportDate}
          onBack={() => setView("list")}
        />
      )}

      {view === "weekly" && (
        <WeeklyComparison
          feedbacks={allFeedbacks}
          onBack={() => setView("list")}
          formatDateLabel={formatDateLabel}
        />
      )}

      {view !== "upload" && (
        <footer className="app-footer">
          Loaded from: <strong>{fileName}</strong>
        </footer>
      )}
    </div>
  );
}

export default App;
