import { useState } from "react";
import { getApiKey, setApiKey, clearApiKey } from "../utils/geminiService";

interface Props {
  onKeyChange: () => void;
}

export function ApiKeyInput({ onKeyChange }: Props) {
  const [key, setKey] = useState(getApiKey());
  const [editing, setEditing] = useState(!getApiKey());
  const hasKey = !!getApiKey();

  const handleSave = () => {
    if (key.trim()) {
      setApiKey(key.trim());
      setEditing(false);
      onKeyChange();
    }
  };

  const handleClear = () => {
    clearApiKey();
    setKey("");
    setEditing(true);
    onKeyChange();
  };

  if (hasKey && !editing) {
    return (
      <div className="api-key-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>Claude API connected</span>
        <button className="api-key-change" onClick={() => setEditing(true)}>
          Change
        </button>
        <button className="api-key-remove" onClick={handleClear}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="api-key-form">
      <label className="api-key-label">
        Anthropic API Key
        <span className="api-key-hint">
          {" "}(for AI-generated session summaries —{" "}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            get one here
          </a>)
        </span>
      </label>
      <div className="api-key-row">
        <input
          type="password"
          className="api-key-input"
          placeholder="Enter your Anthropic API key (sk-ant-...)..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <button className="btn-primary" onClick={handleSave} disabled={!key.trim()}>
          Save
        </button>
        {hasKey && (
          <button className="btn-secondary" onClick={() => { setEditing(false); setKey(getApiKey()); }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
