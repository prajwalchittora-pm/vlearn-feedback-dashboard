import Papa from "papaparse";
import type { FeedbackEntry, SessionSummary } from "../types";

// Maps common CSV header variations to our standard field names
// Special keys prefixed with _ are used for intermediate fields (firstname/lastname)
const HEADER_MAP: Record<string, string> = {
  // Session name
  "session_name": "sessionName",
  "session name": "sessionName",
  "session": "sessionName",
  "activity name": "sessionName",
  "activity": "sessionName",
  "zoom activity": "sessionName",
  // Learner name (combined)
  "learner name": "learnerName",
  "student name": "learnerName",
  "name": "learnerName",
  "learner": "learnerName",
  "student": "learnerName",
  // Firstname / Lastname (will be combined)
  "firstname": "_firstName",
  "first name": "_firstName",
  "first_name": "_firstName",
  "lastname": "_lastName",
  "last name": "_lastName",
  "last_name": "_lastName",
  // Email
  "email": "email",
  "email address": "email",
  "learner email": "email",
  "student email": "email",
  // Rating
  "rating": "rating",
  "score": "rating",
  "feedback score": "rating",
  "rating (out of 5)": "rating",
  "score (out of 5)": "rating",
  // Comment
  "comment": "comment",
  "feedback": "comment",
  "feedback comment": "comment",
  "subjective feedback": "comment",
  "comments": "comment",
  // Date
  "date": "date",
  "session date": "date",
  "sessiondate": "date",
  "feedback date": "date",
  // Course name
  "coursename": "courseName",
  "course name": "courseName",
  "course": "courseName",
  "program": "courseName",
  "program name": "courseName",
};

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function normalizeHeader(header: string): string | null {
  const normalized = header.trim().toLowerCase();
  return HEADER_MAP[normalized] || null;
}

export function parseCSV(file: File): Promise<FeedbackEntry[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.data || results.data.length === 0) {
          reject(new Error("CSV file is empty"));
          return;
        }

        const rawHeaders = Object.keys(results.data[0] as Record<string, string>);
        const headerMapping: Record<string, string> = {};

        for (const header of rawHeaders) {
          const mapped = normalizeHeader(header);
          if (mapped) {
            headerMapping[header] = mapped;
          }
        }

        const entries: FeedbackEntry[] = (results.data as Record<string, string>[]).map(
          (row) => {
            const values: Record<string, string> = {};
            let ratingVal = 0;

            for (const [originalHeader, field] of Object.entries(headerMapping)) {
              const value = row[originalHeader]?.trim() || "";
              if (field === "rating") {
                ratingVal = parseFloat(value) || 0;
              } else {
                values[field] = value;
              }
            }

            // Combine firstname + lastname if separate columns exist
            let learnerName = values["learnerName"] || "";
            if (!learnerName && (values["_firstName"] || values["_lastName"])) {
              learnerName = [values["_firstName"], values["_lastName"]]
                .filter(Boolean)
                .join(" ")
                .trim();
            }

            return {
              sessionName: values["sessionName"] || "Unknown Session",
              learnerName: learnerName || "Unknown",
              email: values["email"] || "",
              rating: ratingVal,
              comment: decodeHtmlEntities(values["comment"] || ""),
              date: values["date"] || "",
              courseName: values["courseName"] || "",
            };
          }
        );

        resolve(entries);
      },
      error(err) {
        reject(err);
      },
    });
  });
}

function isValidFeedback(entry: FeedbackEntry): boolean {
  return entry.learnerName !== "Unknown" || entry.rating > 0 || !!entry.comment;
}

export function groupBySession(entries: FeedbackEntry[]): SessionSummary[] {
  const groups: Record<string, { feedbacks: FeedbackEntry[]; date: string; courseName: string }> = {};

  for (const entry of entries) {
    if (!groups[entry.sessionName]) {
      groups[entry.sessionName] = { feedbacks: [], date: entry.date, courseName: entry.courseName };
    }
    if (isValidFeedback(entry)) {
      groups[entry.sessionName].feedbacks.push(entry);
    } else {
      // Preserve date/course from placeholder rows
      if (!groups[entry.sessionName].date && entry.date) {
        groups[entry.sessionName].date = entry.date;
      }
      if (!groups[entry.sessionName].courseName && entry.courseName) {
        groups[entry.sessionName].courseName = entry.courseName;
      }
    }
  }

  return Object.entries(groups).map(([sessionName, { feedbacks, date, courseName }]) => {
    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const scoreDistribution = [1, 2, 3, 4, 5].map((score) => ({
      score,
      count: feedbacks.filter((f) => Math.round(f.rating) === score).length,
    }));

    // For sessions with no feedback, create a placeholder entry to carry date/course info
    const displayFeedbacks = feedbacks.length > 0 ? feedbacks : [{
      sessionName,
      learnerName: "",
      email: "",
      rating: 0,
      comment: "",
      date,
      courseName,
    } as FeedbackEntry];

    return {
      sessionName,
      averageRating: feedbacks.length > 0 ? totalRating / feedbacks.length : 0,
      totalResponses: feedbacks.length,
      feedbacks: displayFeedbacks,
      scoreDistribution,
    };
  });
}
