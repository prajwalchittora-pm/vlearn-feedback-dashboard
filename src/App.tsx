import { useState } from "react";
import type { FeedbackEntry, SessionSummary } from "./types";
import { parseCSV, groupBySession } from "./utils/csvParser";
import { CsvUploader } from "./components/CsvUploader";
import { SessionList } from "./components/SessionList";
import { SessionDetail } from "./components/SessionDetail";
import "./App.css";

type View = "upload" | "list" | "detail";

function App() {
  const [view, setView] = useState<View>("upload");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

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
        />
      )}

      {view === "detail" && selectedSession && (
        <SessionDetail session={selectedSession} onBack={handleBack} />
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
