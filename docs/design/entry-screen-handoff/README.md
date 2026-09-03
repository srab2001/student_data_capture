# Handoff: IEP Capture Pilot — Entry Screen Redesign

> Historical design reference. The Phase 1–4 implementation supersedes
> the state-management notes below: the production entry screen now records
> immutable observation events, derives session aggregates, keeps idempotent
> pending writes in a staff-specific browser queue, and exposes per-goal
> save/undo status. Phase 2 also replaces "logged today" with plan-aware
> due/evidence status and adds collapsed collection directions. Deployed Phase 3 adds
> Roster/Focus/Timers workflows, shared roster groups, and saved staff
> preferences around these original layouts. Phase 4 changes Summary rather
> than these entry layouts, adding evidence/aim context and metric-appropriate
> charts. The visual language now also covers the deployed synthetic-pilot
> `/admin` console and a navigation Color guide with named swatches and
> hover/focus explanations. The visual references remain useful; do not reintroduce
> the former one-row-per-goal PATCH model.

## Overview
Three layout directions for the "roster sweep" daily-logging screen of the HCPSS IEP Capture Pilot (`srab2001/student_data_capture`), unified into one switchable interface: **Card stack**, **Grid** (spreadsheet-style), and **Accordion** (collapsed roster, expand per student). All three render the same underlying goal data — teachers/aides can pick whichever density suits them, per session.

## About the Design Files
The files in this bundle (`design-reference-entry-screen.html`, `design-reference-wireframes.html`) are **design references built in HTML** — working prototypes showing intended layout, styling and interaction, not production code to copy verbatim. The task is to **recreate this design inside the existing codebase** — Next.js (App Router, TypeScript), Tailwind CSS, React Route Handlers — following that codebase's existing patterns (see "Target codebase" below), not to ship the HTML file itself.

`design-reference-entry-screen.html` is the finished, interactive design (open it directly in a browser). `design-reference-wireframes.html` is the earlier low-fi exploration that led to it — useful for context on the three structural directions, otherwise not needed for implementation.

## Fidelity
**High-fidelity.** The entry-screen reference uses final colors, typography, spacing and component styling from an attached design system called "Organic" (see Design Tokens below) — reproduce it pixel-precisely.

**Important call-out:** the current production app (`app/`, Tailwind, zinc/emerald/amber palette, `min-h-11` tap targets) does **not** use the Organic design system — this redesign introduces it. Confirm with the team whether to:
1. Adopt Organic's tokens (warm cream ground, terracotta accent, Caprasimo/Figtree type, pill buttons) as the app's new visual language, or
2. Keep the app's current Tailwind palette and apply only this design's *structure* (the three-layout switcher, the widget arrangement) with the existing look.
The rest of this document assumes (1); if the team picks (2), map each token below to its closest existing Tailwind class instead.

## Screens / Views
Single screen, `/entry`, with a layout switcher. All three views share one nav bar and title row.

**Shared header**
- Nav bar (`.nav`): brand "IEP Capture Pilot" left; permission-aware
  Entry/Summary/Admin links; the shared, accessible Color guide; Guide; staff
  name; and Sign out on the right.
- Title row: `<h1>` "Roster sweep — Daily Log", staff name + date below it, and a `tag-outline` pill reading "Synthetic data only — pilot" pinned to the right.
- View switcher: a native segmented control (radio group) with three options — Card stack / Grid / Accordion.

**1. Card stack**
- One `.card.elev-sm` per student, `flex-direction: column`, `gap: var(--space-4)` between cards.
- Card header: plan-aware kicker line ("All due evidence collected" / "N/M due goals complete" / "No goals assigned today"), student name as `.card-title`, "Manage goals" ghost button top-right.
- Below: one goal block per goal, separated by a 1px `--color-neutral-200` top border. Each block: domain label (11px uppercase, `.text-muted`), goal text (600 weight), a per-metric-type widget (see Interactions), and a "+ Note" / "Hide note" ghost button top-right that reveals a `.input` textarea.
- Footer: "+ Log accommodation" ghost button revealing a native `<select>` of accommodation names + "Log as used" / "Log as not used" buttons.
- Dashed `.card` at the bottom: "+ Add student to roster".

**2. Grid**
- One `.card.elev-sm` wrapping a `.table`: columns Student, Goal, Domain (as `tag-neutral`), Today (the metric widget). One row per goal (flattened across students) — a student with 2 goals gets 2 rows.
- No note/accommodation controls in this view (traded for density).

**3. Accordion**
- One `.card.elev-sm` per student, collapsed by default to a single clickable row: `▸`/`▾` arrow + name on the left, status text on the right.
- Expanding reveals the same goal blocks as Card stack (minus the note/manage-goals affordances, for simplicity), indented with a dashed left border.
- Same dashed "+ Add student" card at the bottom.

## Interactions & Behavior
Six metric-type widgets, each driven by `goal.metricType` (matches the real `metric_type` Postgres enum):

| metricType | Widget | Behavior |
|---|---|---|
| `accuracy_pct` | Two icon buttons (check / x, Lucide-style, stroke-width 2.75) + running "correct/total (pct%)" label | Each tap increments total, and correct if check tapped |
| `duration_seconds` | Monospace `mm:ss` readout + Start/Stop button | Start records a start timestamp; Stop adds elapsed seconds to a running total; while running, the readout ticks once per second |
| `frequency_count` | Single button labeled "Tally: N" | Tap increments N |
| `prompt_level` | Row of 5 chips (Indep/Verbal/Gestural/Model/Physical) | Each selection is preserved as an observation; the latest selection is highlighted |
| `icon_scale` | Row of 5 chips (Great/Good/Okay/Low/Rough) | Each selection is preserved as an observation; production uses icon glyphs from `lib/icon-sets.ts` |
| `task_analysis_step` | Row of goal-specific, named step chips | Each selection is preserved as an observation; labels come from the goal definition |

- Switching the segmented control (Cards/Grid/Accordion) re-renders the layout only — all logged data (taps, timer state, notes, chip selections) persists across the switch, since it's the same underlying state.
- Notes: per-goal, toggled open/closed, saved on blur (matches existing `onNoteBlur` pattern in `GoalRow.tsx`).
- Accommodation log: per-student, toggled open/closed; select an accommodation name, then "Log as used" / "Log as not used".

## State Management
Reference implementation keeps this local (React state) per goal ID:
- `dp[goalId]`: `{ correct, total }` | `{ seconds, running, startedAt }` | `{ tally }` | `{ prompt }` | `{ mood }` | `{ step }` depending on metric type.
- `noteOpen[goalId]`, `notes[goalId]`
- `expanded[studentId]` (accordion), `accOpen[studentId]`
- `view`: `'cards' | 'grid' | 'accordion'`

In the real app this maps onto `EntryScreen.tsx`'s event queue and derived
session aggregates. Each tap is an independent idempotent POST. Corrections
soft-delete the last event; new events are never edited in place.

## Design Tokens (Organic system)
- Ground: `#f5ead8` · Surface: `#ebddc5` · Text: `#201e1d`
- Accent (terracotta): `#c67139`, ramp 100→900: `#fff2eb #ffe1d0 #ffc6a5 #f6a06b #d67f48 #b2622d #8c491a #643312 #402310`
- Accent-2 (sage): `#7a8a5e`, ramp 100→900: `#f0fae1 #e1eecc #ccdbb2 #aebf92 #8fa073 #728157 #56633f #3d472b #272e1b`
- Neutral ramp 100→900: `#f9f4ed #eee7db #dcd3c4 #c0b6a5 #a19786 #82796a #645c50 #474238 #2e2b25`
- Type: headings "Caprasimo" 400 (h1 42px / h2 32px / h3 25px / h4 20px / h5 16px / h6 13px uppercase), body "Figtree" 400/600/700, base 15px/1.55
- Spacing scale: 4.4 / 8.8 / 13.2 / 17.6 / 26.4 / 35.2px (`--space-1` through `--space-8`, skipping 5/7/9)
- Radius: sm 8px, md 16px, lg 28px; buttons and chips use pill (`999px`) or `--radius-md`
- Shadow: sm/md/lg are soft ink-tinted (`color-mix` with `#2e2b25` at 14/16/22%)
- Components used: `.nav`, `.btn` (`btn-primary`/`btn-secondary`/`btn-ghost`/`btn-icon`), `.tag` (`tag-outline`/`tag-neutral`), `.card`/`.card-kicker`/`.card-title`/`.elev-sm`, `.seg`/`.seg-opt`, `.table`, `.input`, `.text-muted` — all defined in the Organic system's `styles.css`; a full copy of that stylesheet should ship with the design system, not be hand-recreated.

## Assets
No image assets. Two inline SVG icons (check, x) at 14×14, `stroke-width: 2.75`, Lucide-style — copy the exact paths from `design-reference-entry-screen.html`.

## Target codebase mapping
Real repo: `srab2001/student_data_capture` (Next.js App Router + TypeScript, Drizzle/Neon, Tailwind). Existing entry-screen files to modify:
- `app/entry/EntryScreen.tsx` — owns view state, immutable observation events,
  offline retry, derived aggregates, per-goal save status, and undo.
- `app/entry/StudentCard.tsx` — becomes the Card-stack student card; the accordion view's collapsed/expanded student row is a variant of this component.
- `app/entry/GoalRow.tsx` — already has a switch over `goal.metricType`; only the check/x icons (swap emoji for the SVGs above) and chip styling need updating to match this design, if the Organic tokens are adopted.
- New: a Grid-view component (table layout) and an Accordion-view wrapper around `StudentCard`, both reusing `GoalRow` for the actual widgets.
- `components/Header.tsx` — restyle to `.nav` if Organic tokens are adopted app-wide.
- If adopting Organic tokens: bring in the system's `styles.css` (or convert its custom properties into `tailwind.config` theme extensions) rather than hand-copying hex values into Tailwind classes.

## Files
- `design-reference-entry-screen.html` — the finished, interactive three-layout design (open directly in a browser).
- `design-reference-wireframes.html` — the earlier low-fi exploration (three directions × four screens: Login, Entry, Goal editor, Summary) that this design was narrowed down from.
