import type { FeedbackEntry } from "../types";

const API_KEY_STORAGE = "vlearn_anthropic_api_key";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const ENV_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || ENV_API_KEY;
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

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
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API key not set");
  }

  const feedbackLines = feedbacks
    .map(
      (f) =>
        `- ${f.learnerName} (Rating: ${f.rating}/5)${f.comment ? `: "${f.comment}"` : ": No comment"}`
    )
    .join("\n");

  const avgRating =
    feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length;

  const prompt = `You are analyzing learner feedback for a live online session on an ed-tech platform.

Session: "${sessionName}"
Average Rating: ${avgRating.toFixed(1)}/5
Total Responses: ${feedbacks.length}

Learner Feedback:
${feedbackLines}

Analyze this feedback and return a JSON object (no markdown, no code fences, just raw JSON) with these fields:
{
  "overallSentiment": "A 2-3 sentence executive summary of how the session went, highlighting the overall mood and key takeaways for leadership.",
  "sentimentLabel": "positive" OR "mixed" OR "negative",
  "whatWentWell": ["Point 1", "Point 2", ...] (2-4 bullet points summarizing what learners appreciated),
  "whatNeedsImprovement": ["Point 1", "Point 2", ...] (2-4 bullet points on areas of concern from feedback),
  "keyPainPoints": ["Pain point 1", ...] (specific issues learners faced, extracted from negative/neutral comments),
  "actionItems": ["Action 1", ...] (2-3 concrete suggestions for the instructor or program team)
}

If there are no negative comments or concerns, return empty arrays for whatNeedsImprovement and keyPainPoints but still provide general actionItems.
Return ONLY the JSON object, nothing else.`;

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your Anthropic API key.");
    }
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ||
        `Claude API error (${response.status})`
    );
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text || "";

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as AIInsight;
  } catch {
    throw new Error("Failed to parse AI response. Please try again.");
  }
}
