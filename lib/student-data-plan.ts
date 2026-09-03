export type RubricConfig = {
  title: string;
  maxScore: number;
  criteria: string[];
};

export type ObservationDetails =
  | {
      kind: "rubric";
      workSample: string;
      criterion: string | null;
    }
  | {
      kind: "abc";
      antecedent: string;
      behavior: string;
      consequence: string;
    };

export const DEFAULT_PROMPT_HIERARCHY = [
  "Full physical prompt",
  "Partial physical prompt",
  "Gestural prompt",
  "Verbal prompt",
  "Independent",
] as const;

export const TARGET_FREQUENCY_LABEL = {
  session_based: "Every session",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
  quarterly: "Quarterly reporting summary",
} as const;

export const DATA_COLLECTION_CATEGORIES = [
  {
    title: "Academic performance & mastery",
    description:
      "Accuracy trials, fluency/rate probes, and rubric-scored work samples tied to a defined mastery criterion.",
  },
  {
    title: "Behavioral & functional",
    description:
      "Frequency, duration, latency, and structured antecedent-behavior-consequence observations.",
  },
  {
    title: "Independence & support",
    description:
      "Student-specific prompt hierarchies and step-by-step task analyses.",
  },
  {
    title: "Accommodations & access",
    description:
      "Assigned supports, implementation directions, use logs, and staff ratings of impact.",
  },
] as const;
