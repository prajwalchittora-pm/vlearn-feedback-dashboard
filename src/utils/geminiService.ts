import type { FeedbackEntry } from "../types";

export interface AIInsight {
  overallSentiment: string;
  sentimentLabel: "positive" | "mixed" | "negative";
  whatWentWell: string[];
  whatNeedsImprovement: string[];
  keyPainPoints: string[];
  actionItems: string[];
}

export async function generateSessionInsight(
  sessionName: string,
  feedbacks: FeedbackEntry[]
): Promise<AIInsight> {
  const response = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionName, feedbacks }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string })?.error ||
        `Server error (${response.status})`
    );
  }

  return (await response.json()) as AIInsight;
}
