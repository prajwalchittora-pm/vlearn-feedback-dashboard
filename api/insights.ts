import type { VercelRequest, VercelResponse } from "@vercel/node";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  const { sessionName, feedbacks } = req.body;

  if (!sessionName || !Array.isArray(feedbacks) || feedbacks.length === 0) {
    return res.status(400).json({ error: "Missing sessionName or feedbacks" });
  }

  const feedbackLines = feedbacks
    .map(
      (f: { learnerName: string; rating: number; comment?: string }) =>
        `- ${f.learnerName} (Rating: ${f.rating}/5)${f.comment ? `: "${f.comment}"` : ": No comment"}`
    )
    .join("\n");

  const avgRating =
    feedbacks.reduce((s: number, f: { rating: number }) => s + f.rating, 0) /
    feedbacks.length;

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
        max_tokens: 1024,
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
