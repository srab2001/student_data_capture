export type TourStep = {
  /** CSS selector for the element to highlight. Omitted for intro/outro steps. */
  target?: string;
  title: string;
  body: string;
};

export const ENTRY_TOUR_KEY = "iep_pilot_tour_entry_v1";
export const SUMMARY_TOUR_KEY = "iep_pilot_tour_summary_v1";

export const ENTRY_TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to the roster sweep",
    body: "This is the screen you and your aide use during class to log IEP progress — one card per student, everything tap-based. A full sweep of the caseload should take under 3 minutes. Every tap saves immediately, so nothing is lost if the Chromebook closes mid-period.",
  },
  {
    target: '[data-tour="student-card"]',
    title: "One card per student",
    body: "Each student gets their own card, listing only the goals assigned to them. Scroll down to see the rest of your roster.",
  },
  {
    target: '[data-tour="accuracy-counter"]',
    title: "Accuracy trials",
    body: "For accuracy/fluency goals: tap ✓ for a correct trial, ✗ for incorrect. The running percentage updates live next to the buttons.",
  },
  {
    target: '[data-tour="tally-counter"]',
    title: "Behavior tally",
    body: "For frequency-count goals: tap once per occurrence. The count shown is this session's total so far.",
  },
  {
    target: '[data-tour="icon-picker"]',
    title: "Icon-degree rating",
    body: "An alternative to a plain tally — tap one icon to record a single reading (not a running count). The icon set (smiley, stars, thumbs, or Zones of Regulation) is set per goal, not chosen in the moment.",
  },
  {
    target: '[data-tour="timer"]',
    title: "Duration / latency timer",
    body: "Start the timer when the behavior or task begins, Stop when it ends. The elapsed time is saved as this session's reading — you can restart it to keep adding time.",
  },
  {
    target: '[data-tour="prompt-chips"]',
    title: "Prompt-level chips",
    body: "For independence-tracking goals: tap the level of support the student needed — Full Physical through Independent. One tap sets it, no typing.",
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
    body: "One row per active goal, with the current value and trend at a glance. Goals with no recent entry float to the top so they're easy to spot. Click any row to see its detail.",
  },
  {
    target: '[data-tour="summary-detail"]',
    title: "Trend detail",
    body: "A trend line plus every logged reading with its date — the numbers you'd copy into a PLAAFP update or parent progress report.",
  },
  {
    target: '[data-tour="summary-export"]',
    title: "Export",
    body: "CSV for spreadsheets, or a print-friendly view you can save as a PDF. Both are labeled SYNTHETIC or REAL so it's always clear what kind of data you're looking at.",
  },
];
