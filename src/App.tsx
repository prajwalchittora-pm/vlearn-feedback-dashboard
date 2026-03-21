import { useState, useEffect, useMemo } from "react";
import type { FeedbackEntry, SessionSummary } from "./types";
import { parseCSV, groupBySession } from "./utils/csvParser";
import { CsvUploader } from "./components/CsvUploader";
import { SessionList } from "./components/SessionList";
import { SessionDetail } from "./components/SessionDetail";
import { ExecutiveSummary } from "./components/ExecutiveSummary";
import "./App.css";

type View = "loading" | "upload" | "list" | "detail" | "executive";

function App() {
  const [view, setView] = useState<View>("loading");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const allFeedbacks = useMemo(
    () => sessions.flatMap((s) => s.feedbacks),
    [sessions]
  );

  const reportDate = useMemo(() => {
    const dates = allFeedbacks.map((f) => f.date).filter(Boolean);
    return dates[0] || "";
  }, [allFeedbacks]);

  // Auto-load the bundled feedback report on startup
  useEffect(() => {
    async function loadDefault() {
      try {
        const response = await fetch("/default-feedback.csv");
        if (!response.ok) throw new Error("No default data found");
        const blob = await response.blob();
        const file = new File([blob], "feedback_report_21032026.csv", {
          type: "text/csv",
        });
        const entries: FeedbackEntry[] = await parseCSV(file);
        const grouped = groupBySession(entries);
        setSessions(grouped);
        setFileName("feedback_report_21032026.csv");
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
          sessions={sessions}
          onSelectSession={handleSelectSession}
          onReset={handleReset}
          onExecutiveSummary={() => setView("executive")}
        />
      )}

      {view === "detail" && selectedSession && (
        <SessionDetail session={selectedSession} onBack={handleBack} />
      )}

      {view === "executive" && (
        <ExecutiveSummary
          feedbacks={allFeedbacks}
          reportDate={reportDate}
          onBack={() => setView("list")}
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
