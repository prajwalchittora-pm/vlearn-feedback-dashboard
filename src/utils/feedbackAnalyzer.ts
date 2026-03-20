import type { FeedbackEntry } from "../types";

export interface SessionInsight {
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  positiveComments: string[];
  negativeComments: string[];
  neutralComments: string[];
  summary: string;
}

function classifyRating(rating: number): "positive" | "neutral" | "negative" {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "negative";
}

export function analyzeSession(feedbacks: FeedbackEntry[]): SessionInsight {
  const total = feedbacks.length;
  const positive = feedbacks.filter((f) => classifyRating(f.rating) === "positive");
  const neutral = feedbacks.filter((f) => classifyRating(f.rating) === "neutral");
  const negative = feedbacks.filter((f) => classifyRating(f.rating) === "negative");

  const positiveComments = positive
    .map((f) => f.comment)
    .filter((c) => c.length > 2);
  const negativeComments = negative
    .map((f) => f.comment)
    .filter((c) => c.length > 2);
  const neutralComments = neutral
    .map((f) => f.comment)
    .filter((c) => c.length > 2);

  const positivePercent = Math.round((positive.length / total) * 100);
  const neutralPercent = Math.round((neutral.length / total) * 100);
  const negativePercent = Math.round((negative.length / total) * 100);

  const avgRating = feedbacks.reduce((s, f) => s + f.rating, 0) / total;

  // Build summary text
  const parts: string[] = [];

  if (positivePercent >= 80) {
    parts.push(
      `Overwhelmingly positive session — ${positivePercent}% of learners rated it 4 or above (avg ${avgRating.toFixed(1)}/5).`
    );
  } else if (positivePercent >= 60) {
    parts.push(
      `Generally well-received — ${positivePercent}% positive ratings (avg ${avgRating.toFixed(1)}/5).`
    );
  } else if (positivePercent >= 40) {
    parts.push(
      `Mixed reception — only ${positivePercent}% rated 4+, with ${negativePercent}% rating below 3 (avg ${avgRating.toFixed(1)}/5).`
    );
  } else {
    parts.push(
      `Session needs attention — ${negativePercent}% of learners gave low ratings (avg ${avgRating.toFixed(1)}/5).`
    );
  }

  if (positiveComments.length > 0) {
    parts.push(
      `${positiveComments.length} positive comment${positiveComments.length > 1 ? "s" : ""} received.`
    );
  }

  if (negativeComments.length > 0) {
    parts.push(
      `${negativeComments.length} concern${negativeComments.length > 1 ? "s" : ""} raised by learners — review needed.`
    );
  } else if (negative.length > 0) {
    parts.push(
      `${negative.length} low rating${negative.length > 1 ? "s" : ""} without comments — consider follow-up.`
    );
  }

  if (negativePercent === 0 && neutralPercent === 0) {
    parts.push("No concerns flagged.");
  }

  return {
    positivePercent,
    neutralPercent,
    negativePercent,
    positiveComments,
    negativeComments,
    neutralComments,
    summary: parts.join(" "),
  };
}
