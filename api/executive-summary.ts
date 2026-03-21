import type { VercelRequest, VercelResponse } from "@vercel/node";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface SessionDigest {
  name: string;
  course: string;
  avg: number;
  total: number;
  distribution: number[]; // [1star, 2star, 3star, 4star, 5star]
  comments: { learner: string; rating: number; text: string }[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  const { sessions, reportDate, totalFeedbacks, overallAvg } = req.body as {
    sessions: SessionDigest[];
    reportDate: string;
    totalFeedbacks: number;
    overallAvg: number;
  };

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ error: "Missing session data" });
  }

  // Build compact prompt from pre-aggregated data
  const sessionLines = sessions
    .map((s) => {
      const dist = `[1★:${s.distribution[0]} 2★:${s.distribution[1]} 3★:${s.distribution[2]} 4★:${s.distribution[3]} 5★:${s.distribution[4]}]`;
      const commentBlock =
        s.comments.length > 0
          ? s.comments
              .map((c) => `  - ${c.learner} (${c.rating}/5): "${c.text}"`)
              .join("\n")
          : "  (no comments)";
      return `SESSION: "${s.name}" [${s.course}]\nAvg: ${s.avg.toFixed(1)}/5 | N=${s.total} | ${dist}\n${commentBlock}`;
    })
    .join("\n\n");

  const prompt = `You are a senior education operations analyst producing an executive summary for leadership at HeroVired (ed-tech). This is a weekly feedback report from live sessions.

Report Date: ${reportDate || "This week"}
Total Sessions: ${sessions.length}
Total Responses: ${totalFeedbacks}
Overall Avg: ${overallAvg.toFixed(1)}/5

${sessionLines}

Return a JSON object (no markdown/code fences) with:
{
  "executiveSummary": "3-5 sentence executive summary for leadership. Be direct, actionable, honest.",
  "overallSentiment": "positive"|"mixed"|"negative",
  "topHighlights": ["3-5 standout positive observations"],
  "criticalEscalations": [{"session":"name","issue":"description","learnerQuote":"exact quote if available","severity":"high"|"critical"}] (ONLY genuinely critical items),
  "issueBuckets": [{"category":"e.g. Faculty/Teaching, Technical/Platform, Operations/Management, Content/Curriculum, Pacing/Time, Communication","count":number,"sessions":["affected sessions"],"summary":"1-2 sentences"}],
  "standoutPositiveFeedback": [{"session":"name","learner":"name","quote":"exact quote","whyNotable":"reason"}] (2-4 notable quotes),
  "sessionsNeedingAttention": [{"session":"name","avgRating":number,"reason":"brief"}],
  "sessionsExcelling": [{"session":"name","avgRating":number,"reason":"brief"}],
  "actionItems": ["3-5 prioritized recommendations"]
}

Be honest. Do not sugarcoat. Return ONLY JSON.`;

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
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
}
