export interface FeedbackEntry {
  sessionName: string;
  learnerName: string;
  email: string;
  rating: number;
  comment: string;
  date: string;
  courseName: string;
}

export interface SessionSummary {
  sessionName: string;
  averageRating: number;
  totalResponses: number;
  feedbacks: FeedbackEntry[];
  scoreDistribution: { score: number; count: number }[];
}
