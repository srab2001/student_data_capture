export type TourStep = {
  /** CSS selector for the element to highlight. Omitted for intro/outro steps. */
  target?: string;
  title: string;
  body: string;
};

export const ENTRY_TOUR_KEY = "iep_pilot_tour_entry_v2";
export const SUMMARY_TOUR_KEY = "iep_pilot_tour_summary_v2";

export const ENTRY_TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to classroom capture",
    body: "This is the screen you and your aide use during class to log IEP progress. Each goal shows whether it is due and how many observations are required. Every tap is preserved, and Undo last corrects a mistaken tap.",
  },
  {
    target: '[data-tour="workflow-modes"]',
    title: "Choose the workflow that fits the moment",
    body: "Roster shows the whole selected group, Focus keeps one student on screen with Previous and Next navigation, and Timers collects every duration goal into large start/stop controls. Your mode and roster layout are saved to your staff account.",
  },
  {
    target: '[data-tour="roster-group-filter"]',
    title: "Narrow to an instructional group",
    body: "Choose a teacher-defined roster group without changing the underlying classroom roster. Teachers can manage shared groups; aides can use them. Choose All students to return to the full roster.",
  },
  {
    target: '[data-tour="student-card"]',
    title: "One card per student",
    body: "Each student gets their own card, listing only the goals assigned to them. The header counts today's due goals, and each goal shows evidence collected versus required. Scroll down to see the rest of your roster.",
  },
  {
    target: '[data-tour="accuracy-counter"]',
    title: "Accuracy trials",
    body: "For accuracy/fluency goals: tap ✓ for a correct trial, ✗ for incorrect. The running percentage updates live next to the buttons.",
  },
  {
    target: '[data-tour="tally-counter"]',
    title: "Behavior tally",
    body: "For frequency-count goals: tap once per occurrence. When the planned window ends, select Window complete — including for zero occurrences — so the app records a complete observation rather than treating an occurrence as the window.",
  },
  {
    target: '[data-tour="icon-picker"]',
    title: "Icon-degree rating",
    body: "An alternative to a plain tally — each tap records a separate reading, so multiple observations in one session are preserved. The icon set (smiley, stars, thumbs, or Zones of Regulation) is set per goal.",
  },
  {
    target: '[data-tour="timer"]',
    title: "Duration / latency timer",
    body: "Start the timer when the behavior or task begins, Stop when it ends. You can restart it to keep adding time. If the planned observation ends with no occurrence, select No occurrence so that valid zero is still counted as evidence.",
  },
  {
    target: '[data-tour="prompt-chips"]',
    title: "Prompt-level chips",
    body: "For independence-tracking goals: tap the level of support the student needed — Full Physical through Independent. Each tap is a separate observation, so change across the session is retained.",
  },
  {
    target: '[data-tour="note-toggle"]',
    title: "Optional notes",
    body: "Every goal can carry a short note — useful for ABC (antecedent-behavior-consequence) observations. It's collapsed by default to keep the sweep fast.",
  },
  {
    target: '[data-tour="accommodation-section"]',
    title: "Accommodation logging",
    body: "Log whether an accommodation was used today and how effective it was, using the same star-rating control as icon-degree goals.",
  },
  {
    title: "That's the whole sweep",
    body: "When you're done, head to Summary in the header to see trends across sessions — that's where you'll pull numbers for a PLAAFP update. You can replay this tour anytime with the \"? Take the tour\" button.",
  },
];

export const SUMMARY_TOUR_STEPS: TourStep[] = [
  {
    title: "Progress summary",
    body: "This is a read-mostly view for writing PLAAFP updates — it never writes back to Maryland Online IEP. Everything here rolls up the data points logged on the entry screen.",
  },
  {
    target: '[data-tour="summary-filters"]',
    title: "Filters",
    body: "Narrow by date range, IEP domain, or a single student. The goal list and export both respect these filters.",
  },
  {
    target: '[data-tour="summary-table"]',
    title: "Goal list",
    body: "One row per goal shows the current value, collection-plan compliance, and number of observation days. Goals needing scheduled evidence surface first. Select a goal to review the evidence behind the status.",
  },
  {
    target: '[data-tour="summary-detail"]',
    title: "Evidence detail",
    body: "Quantitative goals use a time-series chart and an optional explicit aim line. Prompt and icon goals use category counts. Collection, evidence-depth, and aim labels explain what the data can support; they do not determine mastery.",
  },
  {
    target: '[data-tour="summary-export"]',
    title: "Export",
    body: "CSV for spreadsheets, or a print-friendly view you can save as a PDF. Both include collection, evidence-depth, aim, and intervention context and remain manual supports for IEP reporting.",
  },
];
