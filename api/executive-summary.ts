import type { VercelRequest, VercelResponse } from "@vercel/node";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface FeedbackItem {
  sessionName: string;
  learnerName: string;
  email: string;
  rating: number;
  comment: string;
  courseName: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  const { feedbacks, reportDate } = req.body;

  if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
    return res.status(400).json({ error: "Missing feedbacks" });
  }

  // Build a condensed view of all feedback grouped by session
  const sessionMap: Record<string, FeedbackItem[]> = {};
  for (const f of feedbacks as FeedbackItem[]) {
    if (!sessionMap[f.sessionName]) sessionMap[f.sessionName] = [];
    sessionMap[f.sessionName].push(f);
  }

  const sessionSummaries = Object.entries(sessionMap)
    .map(([name, fbs]) => {
      const avg = fbs.reduce((s, f) => s + f.rating, 0) / fbs.length;
      const comments = fbs
        .filter((f) => f.comment && f.comment.length > 2)
        .map((f) => `  - ${f.learnerName} (${f.rating}/5): "${f.comment}"`)
        .join("\n");
      return `Session: "${name}" [${fbs[0].courseName || "N/A"}]\nAvg: ${avg.toFixed(1)}/5 | Responses: ${fbs.length}\n${comments || "  (no comments)"}`;
    })
    .join("\n\n");

  const totalFeedbacks = feedbacks.length;
  const overallAvg =
    feedbacks.reduce((s: number, f: FeedbackItem) => s + f.rating, 0) /
    totalFeedbacks;

  const prompt = `You are a senior education operations analyst producing an executive summary for leadership at an ed-tech company (HeroVired). This is a weekly feedback report from live sessions on the LMS.

Report Date: ${reportDate || "This week"}
Total Sessions: ${Object.keys(sessionMap).length}
Total Feedback Responses: ${totalFeedbacks}
Overall Average Rating: ${overallAvg.toFixed(1)}/5

SESSION-WISE FEEDBACK:
${sessionSummaries}

Analyze ALL the feedback above and return a JSON object (no markdown, no code fences, just raw JSON) with these fields:

{
  "executiveSummary": "A 3-5 sentence high-level summary for leadership. Include overall sentiment, key highlights, and critical concerns. Be direct and actionable.",

  "overallSentiment": "positive" OR "mixed" OR "negative",

  "topHighlights": ["highlight 1", "highlight 2", ...] (3-5 standout positive observations across all sessions),

  "criticalEscalations": [
    {
      "session": "session name",
      "issue": "brief description of the critical issue",
      "learnerQuote": "exact quote from the learner if available",
      "severity": "high" OR "critical"
    }
  ] (issues that need IMMEDIATE leadership attention — very negative feedback, serious complaints, operational failures. Only include genuinely critical items, not mild concerns.),

  "issueBuckets": [
    {
      "category": "category name (e.g. Faculty/Teaching, Technical/Platform, Operations/Management, Content/Curriculum, Pacing/Time, Communication)",
      "count": number of feedback entries that fall in this bucket,
      "sessions": ["session names affected"],
      "summary": "1-2 sentence summary of issues in this bucket"
    }
  ] (categorize ALL negative and neutral feedback into buckets. Be specific about what category each issue belongs to.),

  "standoutPositiveFeedback": [
    {
      "session": "session name",
      "learner": "learner name",
      "quote": "the exact positive quote",
      "whyNotable": "brief reason this stands out"
    }
  ] (2-4 particularly notable positive comments that leadership would want to see — heartfelt praise, specific instructor appreciation, etc.),

  "sessionsNeedingAttention": [
    {
      "session": "session name",
      "avgRating": number,
      "reason": "brief reason this session needs attention"
    }
  ] (sessions with low ratings or concerning feedback patterns),

  "sessionsExcelling": [
    {
      "session": "session name",
      "avgRating": number,
      "reason": "brief reason this session excelled"
    }
  ] (top performing sessions),

  "actionItems": ["action 1", "action 2", ...] (3-5 concrete, prioritized recommendations for the team)
}

Be honest and direct. Do not sugarcoat issues. Leadership needs to know the real picture.
Return ONLY the JSON object, nothing else.`;

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error:
          (err as { error?: { message?: string } })?.error?.message ||
          `Anthropic API error (${response.status})`,
      });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || "";

    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
}
