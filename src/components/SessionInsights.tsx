import { useEffect, useMemo, useState } from "react";
import type { FeedbackEntry } from "../types";
import { analyzeSession } from "../utils/feedbackAnalyzer";
import {
  generateSessionInsight,
  getApiKey,
  type AIInsight,
} from "../utils/geminiService";

interface Props {
  feedbacks: FeedbackEntry[];
  sessionName: string;
}

export function SessionInsights({ feedbacks, sessionName }: Props) {
  const basicInsight = useMemo(() => analyzeSession(feedbacks), [feedbacks]);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasApiKey = !!getApiKey();

  const fetchAiInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSessionInsight(sessionName, feedbacks);
      setAiInsight(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI insight");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasApiKey) {
      fetchAiInsight();
    }
  }, [sessionName, hasApiKey]);

  return (
    <div className="insights-section">
      <div className="insights-header">
        <h3>Session Summary</h3>
        {hasApiKey && (
          <span className="ai-badge">AI-powered</span>
        )}
      </div>

      {/* Sentiment bar — always shown from basic analysis */}
      <div className="insights-bar">
        {basicInsight.positivePercent > 0 && (
          <div
            className="bar-segment bar-positive"
            style={{ width: `${basicInsight.positivePercent}%` }}
            title={`${basicInsight.positivePercent}% positive`}
          >
            {basicInsight.positivePercent >= 15 && `${basicInsight.positivePercent}%`}
          </div>
        )}
        {basicInsight.neutralPercent > 0 && (
          <div
            className="bar-segment bar-neutral"
            style={{ width: `${basicInsight.neutralPercent}%` }}
            title={`${basicInsight.neutralPercent}% neutral`}
          >
            {basicInsight.neutralPercent >= 15 && `${basicInsight.neutralPercent}%`}
          </div>
        )}
        {basicInsight.negativePercent > 0 && (
          <div
            className="bar-segment bar-negative"
            style={{ width: `${basicInsight.negativePercent}%` }}
            title={`${basicInsight.negativePercent}% negative`}
          >
            {basicInsight.negativePercent >= 15 && `${basicInsight.negativePercent}%`}
          </div>
        )}
      </div>
      <div className="insights-legend">
        <span className="legend-item">
          <span className="legend-dot dot-positive" /> Positive (4-5)
        </span>
        <span className="legend-item">
          <span className="legend-dot dot-neutral" /> Neutral (3)
        </span>
        <span className="legend-item">
          <span className="legend-dot dot-negative" /> Negative (1-2)
        </span>
      </div>

      {/* AI-generated insight */}
      {loading && (
        <div className="ai-loading">
          <div className="spinner" />
          <span>Analyzing feedback with AI...</span>
        </div>
      )}

      {error && (
        <div className="ai-error">
          <span>{error}</span>
          <button onClick={fetchAiInsight}>Retry</button>
        </div>
      )}

      {aiInsight && !loading && (
        <div className="ai-insight-content">
          <p className="insights-summary">{aiInsight.overallSentiment}</p>

          <div className="insights-columns">
            {aiInsight.whatWentWell.length > 0 && (
              <div className="insight-col insight-positive">
                <h4>What went well</h4>
                <ul>
                  {aiInsight.whatWentWell.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiInsight.whatNeedsImprovement.length > 0 && (
              <div className="insight-col insight-negative">
                <h4>What needs improvement</h4>
                <ul>
                  {aiInsight.whatNeedsImprovement.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {aiInsight.keyPainPoints.length > 0 && (
            <div className="pain-points">
              <h4>Key Pain Points</h4>
              <ul>
                {aiInsight.keyPainPoints.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {aiInsight.actionItems.length > 0 && (
            <div className="action-items">
              <h4>Recommended Actions</h4>
              <ul>
                {aiInsight.actionItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Fallback to basic analysis when no API key */}
      {!hasApiKey && !loading && (
        <>
          <p className="insights-summary">{basicInsight.summary}</p>
          <div className="insights-columns">
            {basicInsight.positiveComments.length > 0 && (
              <div className="insight-col insight-positive">
                <h4>What went well</h4>
                <ul>
                  {basicInsight.positiveComments.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {(basicInsight.negativeComments.length > 0 ||
              basicInsight.neutralComments.length > 0) && (
              <div className="insight-col insight-negative">
                <h4>What needs improvement</h4>
                <ul>
                  {basicInsight.negativeComments.map((c, i) => (
                    <li key={`neg-${i}`}>{c}</li>
                  ))}
                  {basicInsight.neutralComments.map((c, i) => (
                    <li key={`neu-${i}`} className="neutral-comment">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="ai-prompt-banner">
            <span>
              Add an Anthropic API key to get AI-powered insights with sentiment analysis,
              pain points, and action items.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
