# Strategy: AI-assisted goal/measurement-plan wizard and accommodation chat

Prepared 2026-09-04 against `srab2001/student_data_capture`, branch
`claude/teacher-goal-accommodation-wizard-4p1rit` (HEAD `bdbb861`). This
document is the engineering strategy for two new asks:

1. A **wizard** that uses the Anthropic API to help a teacher draft an IEP
   goal and its structured measurement plan.
2. A **chat** that uses the Anthropic API to help a teacher choose an
   appropriate accommodation for a student.

It sits alongside `docs/compliance.md` (the compliance source of truth for
this app) and `STRATEGY-application-improvement.md` (the active roadmap).
Nothing here changes those documents' authority — it extends them with the
one thing they don't yet cover: **this app has never sent student data to a
third-party AI service before, and both of these features do exactly
that.**

---

## 1. Personnel roster

This app is, in reality, a single-classroom prototype built by one teacher
using Claude Code — not a district-staffed initiative yet. Mapping the
standard roster onto that reality rather than pretending otherwise:

| Role | Who, today | Gap |
|---|---|---|
| **Executive sponsor** | Not yet identified (same gap `docs/compliance.md` already records) | Open |
| **Data privacy & compliance officer** | Not yet identified | **Open — and now more urgent.** Adding an AI vendor in the data path is exactly the kind of change that should not go live on real student data without this person existing and signing off. |
| **IT / data systems lead** | Not yet identified | Open |
| **SIS / integration specialist** | N/A — no SIS integration exists yet | N/A for this feature |
| **Application developer** | You, using Claude Code | Filled |
| **UX/design-minded lead** | You | Filled, informally — see the UX risk in §4 |
| **End-user representatives** | Not yet identified beyond yourself | Open — flag before any real-teacher pilot of these two features |
| **Security/access-control owner** | Not yet identified | Open |
| **Parent/community liaison** | N/A today | Situational — becomes relevant only if/when this reaches Track B |

Nothing here is new versus the existing app's gaps, with one exception worth
naming plainly: **you are about to make the compliance-officer gap materially
worse if these features ship to real data before that role exists**, because
"an AI vendor now sees goal and accommodation text" is a bigger ask of that
future officer's sign-off than anything built so far. Treat that as a reason
to keep this on Track A (synthetic data) even more strictly than the rest of
the app, not a reason to skip the review.

---

## 2. Compliance and governance review

This is a working checklist, not legal advice — HCPSS's own FERPA official
and counsel must review and sign off before real student data reaches
either feature, exactly as already required for the rest of this app in
`docs/compliance.md`.

### 2.1 Classify the data these features touch

Both features read and write data already classified in `docs/compliance.md`
as FERPA education records that are also IDEA-linked special education data:
goal text, domain, metric type, measurement-plan fields (baseline,
observable definition, mastery criterion, etc.), and accommodation name/
setting/implementation notes/effectiveness history. Nothing here introduces
a *new category* of data — it introduces a **new destination** for data that
already exists: the Anthropic API.

### 2.2 The new third-party/vendor finding (this is the real issue)

`docs/compliance.md` §"Third-party / vendor exposure" already says, in
anticipation of exactly this: *"No analytics, error-tracking, or AI/voice-
transcription service should ever receive real student data without its own
explicit review."* That review is this section.

- **Anthropic becomes a data processor the moment either feature sends a
  real student's goal text or accommodation history in an API request** —
  the same "self-built doesn't mean no vendor" logic already recorded for
  Vercel/Neon applies here, and applies to Maryland's COMAR/state overlay
  just as it does to hosting.
- Anthropic's API (as opposed to consumer Claude.ai) does not train on
  customer data by default and offers configurable data retention — but
  **do not rely on a general claim here**: before Track B, the compliance
  officer needs the district's actual data processing agreement (or
  confirmation that Anthropic's standard API terms satisfy the district's
  requirements) on file, the same way a DPA would be required for any new
  ed-tech vendor. Record the agreed retention window in `docs/compliance.md`
  once known.
- **Data minimization is the highest-leverage mitigation available and
  should be designed in now, not bolted on later**: neither feature needs
  the student's name, ID, or any other directly identifying field to do its
  job. The wizard needs goal domain/metric type/grade-band context; the
  chat needs domain, existing goal categories, and prior accommodation
  effectiveness *patterns* (not narrative notes verbatim, ideally). Design
  both server-side proxies (§5) to strip identifying fields before they ever
  leave the server, and pass only a synthetic/opaque reference (e.g. "the
  student" or a session-scoped label) for anything the response needs to
  refer back to. This is the single biggest thing this plan asks of the
  implementation, so it is called out again as a concrete Phase 0 task
  below.
- No voice/audio is involved (matches the existing "no voice capture"
  guardrail) — text only.

### 2.3 Consent and notification

Not yet decided, matching the rest of the app. Introducing an AI vendor into
IEP-adjacent decision support is very plausibly the kind of change a
privacy officer folds into parent notification, especially given growing
state-level scrutiny of AI use with student data specifically (several
states, including movement in Maryland's peer states, have begun treating
"AI processing of student records" as its own notice category distinct from
general software vendors). **Recommend the privacy officer be asked this
question directly and by name** ("does routing IEP goal/accommodation
text through an AI API require its own parent notice, separate from the
platform's own?") rather than assuming IDEA's existing procedural
safeguards cover it.

### 2.4 State law overlay

Same "not yet confirmed in detail" status as the rest of the app
(`docs/compliance.md` §"State law overlay") — Maryland/COMAR review is
already pending for the base app, and should explicitly include the AI
vendor question above when it happens, not treat it as a separate future
review.

### 2.5 Data minimization (concrete deltas)

- The wizard should never send the student's name/ID to Anthropic. It only
  needs: goal domain, metric type (and, where useful, a teacher-typed short
  free-text description of the skill/behavior) to draft `observableDefinition`,
  `measurementMethod`, `masteryCriterion`, and a proposed collection
  schedule. Baseline data, if used to help set a criterion, should be
  summarized numerically (e.g. "baseline: 40% accuracy over 3 sessions"),
  never pasted as raw narrative that might contain identifying detail.
- The accommodation chat should work from **structured** signals already in
  `student_accommodations`/`accommodation_logs` (domain, existing
  accommodation names, effectiveness ratings, setting) rather than free-text
  `implementationNotes`, wherever the two can be made to serve the same
  purpose — narrative notes are the field most likely to accidentally carry
  identifying or sensitive detail.

### 2.6 Retention and deletion

Anthropic API requests are not stored by this application beyond what's
needed to render the response (see §5 — no new database table stores raw AI
prompts/responses by default). If a future decision is made to log AI
interactions for quality review, that log becomes new FERPA-scoped data
subject to the same retention questions as everything else in
`docs/compliance.md`, and needs its own line item there before it exists —
don't add such logging silently as an implementation convenience.

### 2.7 Access control boundaries

No change to the existing model: both features are reachable only through
the existing authenticated, classroom-scoped session, gated by the same
`canManageGoals` (wizard) and `canManageStudents`/accommodation-management
capability (chat) used by the screens they extend. No new visibility tier is
needed.

### 2.8 Findings summary

| # | Finding | Tier |
|---|---|---|
| 1 | No compliance officer exists yet to approve a new AI vendor touching real student data | **Blocker** (for Track B only — does not block Track A/synthetic build) |
| 2 | No Anthropic data processing/retention agreement on file | **Blocker** (Track B) |
| 3 | State (Maryland/COMAR) AI-specific requirements unconfirmed | Needs a decision |
| 4 | Parent notification scope for AI-assisted decision support unconfirmed | Needs a decision |
| 5 | Data minimization design (never send student name/ID; prefer structured fields over narrative notes) | **Resolved by design** — carried into Phase A0/A1 as a concrete build requirement, not left as a policy hope |
| 6 | No new database logging of AI prompts/responses planned | Resolved (by omission — flag before adding later) |

Findings 1-4 are carried into Phase A0 below exactly as the base app already
carries its own open items — as explicit, named tasks, not a footnote.

---

## 3. Strategy assessment

**What's solid:** both features are additive decision-support layers on top
of data structures that already exist and are already well-modeled
(`MeasurementPlan`, `student_accommodations`). Neither requires a schema
change to the core student/goal/accommodation tables — the AI proposes
values that a human reviews and saves through the *existing*, already-
authorized `POST /api/goals` and `POST /api/student-accommodations`
endpoints. That's the right shape: the AI never gets its own write path into
student records.

**What I'd push back on / gaps to close before building:**

- **"Wizard" and "chat" are UI commitments, not just API calls** — a
  multi-turn chat in particular is easy to scope-creep into something that
  takes longer to build well than the underlying API call. Recommend
  scoping the accommodation feature as a short, bounded Q&A (3-5 exchanges
  max, ending in a concrete suggested accommodation) rather than an
  open-ended chat window, both for UX (a teacher between classes won't use
  an open-ended chat) and for compliance (bounded turns are easier to audit
  and to keep free of accidentally-typed identifying detail than a freeform
  conversation).
- **Latency and classroom rhythm**: goal/measurement-plan authoring already
  happens outside the classroom-instruction moment (on `/goals/[studentId]`,
  not `/entry`), so a few seconds of AI latency there is acceptable. The
  accommodation chat should be scoped the same way — a planning-time tool
  on the goals/accommodations screen, not something added to the
  time-pressured `/entry` roster sweep.
- **The AI must never be the source of truth for measurement validity.**
  This app has been carefully built so that mastery criteria, baselines, and
  observation requirements are teacher-authored and versioned
  (`docs/compliance.md`, Phase 2 log). The wizard should draft a *proposal*
  the teacher edits and explicitly approves before it's saved as a real goal
  version — never a silent auto-fill that saves on its own. Same for the
  accommodation chat: it suggests, the teacher decides and saves via the
  existing form.
- **Cost/failure handling**: Anthropic API calls can fail or time out.
  Neither feature should block the teacher from doing the manual
  goal/accommodation entry that already works today — both need a visible,
  graceful "AI unavailable, continue manually" fallback, not a dead end.
- **Scale fit**: this is still a single classroom on synthetic data. Nothing
  about the AI layer needs to be over-engineered for multi-classroom scale
  yet — a simple per-staff rate limit (reusing the existing `checkRateLimit`
  pattern) is enough for now.

**Bottom line:** the plan below is buildable now, entirely on synthetic
data, exactly like the rest of this app's Track A work. It should **not**
reach real student data until the Blockers in §2.8 are resolved — same gate
as everything else in `docs/compliance.md`, just with an added named vendor
(Anthropic) in the sign-off conversation.

---

## 4. Phased implementation plan

Stack, as established by the rest of this repo: Next.js App Router on
Vercel, Neon Postgres via Drizzle, the existing `lib/auth/authz.ts`
authorization helper, `lib/rate-limit.ts` for write throttling, and
`recordAudit()` for audit logging. New work adds one dependency
(`@anthropic-ai/sdk`) and one new server-only env var (`ANTHROPIC_API_KEY`).

### Phase A0 — Governance record and server-only AI plumbing

**Goal:** Record the §2 findings in `docs/compliance.md`, and stand up a
minimal, auditable server-side AI client before any feature code calls it.

**Owners:** You (developer), with the compliance findings flagged for the
still-unnamed compliance officer.

```
Add a new section to docs/compliance.md titled "AI-assisted features
(goal/measurement-plan wizard, accommodation chat)" recording: (1) that
Anthropic's API becomes a data processor for goal and accommodation data
the moment either feature is used, (2) the data-minimization design — no
student name/ID is ever sent to the API, only goal domain/metric
type/structured accommodation fields, (3) the open blockers: no compliance
officer yet, no Anthropic data processing/retention agreement on file, and
Maryland/COMAR AI-specific requirements unconfirmed, (4) that both features
remain gated to synthetic data (Track A) until those blockers clear, same
as the rest of this app. Follow the existing doc's tone and table style.
```

```
Add the @anthropic-ai/sdk package. Create lib/ai/client.ts exporting a
single server-only Anthropic client built from process.env.ANTHROPIC_API_KEY
(throw a clear startup error if it's missing, matching how DATABASE_URL is
handled). Add ANTHROPIC_API_KEY to .env.local.example with a comment
explaining it must never be exposed to the client bundle — confirm no
"NEXT_PUBLIC_" prefix is ever used for it, and add a short note to
docs/compliance.md's "Third-party / vendor exposure" section pointing here.
```

```
Create lib/ai/redact.ts with a small set of functions that build the
*only* payloads this app is allowed to send to Anthropic: one for the goal
wizard (domain, metric type, optional short skill/behavior description,
numeric baseline summary — never a student name or ID) and one for the
accommodation chat (domain, existing accommodation names/effectiveness
ratings/settings — never narrative implementation notes or student name).
Add unit tests asserting that no function's output can contain a key named
studentId, displayName, or similar, even if the caller's input object
happens to include one — this should be defensive by construction, not by
caller discipline alone.
```

### Phase A1 — Goal & measurement-plan wizard: backend

**Goal:** A single authorized endpoint that turns a teacher's short
description into a *proposed* `MeasurementPlan` (`lib/measurement-plans.ts`)
for review — never a direct write to `goals`.

```
Create POST /api/ai/goal-wizard, following the pattern in
app/api/goals/route.ts: requireStaff, assertPermission(current,
"canManageGoals"), assertWriteRateLimit(current.id, "ai:goal-wizard")
using the existing lib/rate-limit.ts (a lower per-window limit than data
writes, since this calls an external API). Accept { domain, metricType,
skillDescription, baselineSummary? } validated with a new Zod schema in
lib/validation.ts. Build the redacted payload via lib/ai/redact.ts, call
the Anthropic client from lib/ai/client.ts asking it to propose a
MeasurementPlan matching the exact shape in lib/measurement-plans.ts
(baseline, observableDefinition, measurementMethod, masteryCriterion,
collectionDays, observationsRequired, setting,
opportunitiesRequired/observationWindowMinutes, responsibleRole). Require
Claude's response as structured JSON (use tool use / a strict JSON schema,
not free text you parse with regex), then re-validate the response against
the same MeasurementPlan Zod schema used for manual goal creation before
returning it — never trust the model's output to already match the shape.
Return a clear, distinct error (not a 500) if the API call fails or times
out, and record an audit log entry (action "ai_suggest", tableName
"goals") that records who asked and which fields were requested — never the
AI's response content, to avoid duplicating student-adjacent detail in the
audit table.
```

```
Write unit tests for /api/ai/goal-wizard covering: unauthorized/wrong-
permission rejection, rate-limit rejection, malformed-response-from-model
rejection (mock the Anthropic client to return invalid JSON and confirm
the route returns a clean error, not a crash), and that the redacted
request payload sent to the mocked client never contains studentId or
displayName.
```

### Phase A2 — Goal & measurement-plan wizard: frontend

**Goal:** A guided flow on the existing `/goals/[studentId]` screen that
proposes a plan for the teacher to edit and approve — not a replacement for
the existing manual goal editor.

```
Add an "AI-assisted setup" entry point to GoalsManager.tsx on
/goals/[studentId], alongside the existing manual goal-creation form (do
not replace it). Build a short wizard: step 1 asks for domain, metric type,
and a short free-text skill/behavior description (and optional baseline
summary); step 2 calls POST /api/ai/goal-wizard and shows the proposed
measurement plan pre-filled into the *same* form fields the manual editor
already uses — every field must remain editable, and nothing saves until
the teacher clicks the existing "create goal" action. Show a clear
"AI-suggested — review before saving" label on pre-filled fields, and a
graceful fallback ("AI unavailable — continue manually") that drops the
teacher into the existing manual form unchanged if the API call fails.
```

```
Run an accessibility pass on the new wizard steps matching the standard
already applied elsewhere in this app (keyboard navigation, aria-live
status for the "generating..." and error states, focus management between
steps, touch target size for classroom tablets).
```

### Phase A3 — Accommodation selection chat: backend

**Goal:** A bounded (not open-ended) Q&A endpoint that ends in a concrete
suggested accommodation the teacher can save via the existing
`student_accommodations` API.

```
Create POST /api/ai/accommodation-chat, following the same pattern as
Phase A1: requireStaff, assertPermission for accommodation management,
rate-limited. Accept a short conversation history (capped at 5 exchanges —
reject a 6th turn with a clear "please start a new suggestion" response
rather than silently truncating) plus redacted context from
lib/ai/redact.ts (domain, existing accommodation names/effectiveness/
settings for this student — never narrative notes or the student's name).
System-prompt the model to ask at most 2-3 clarifying questions and then
propose a concrete accommodation as structured JSON: { name, setting,
implementationNotes } matching the shape POST /api/student-accommodations
already accepts, validated with that same existing Zod schema before being
returned to the client. Audit-log the interaction the same minimal way as
Phase A1 (who asked, not the content).
```

```
Write unit tests mirroring Phase A1's: auth/permission/rate-limit
rejection, malformed-model-output rejection, conversation-length cap
enforcement, and confirmation that the redacted payload never includes
studentId, displayName, or raw implementationNotes text.
```

### Phase A4 — Accommodation selection chat: frontend

**Goal:** A bounded chat widget on the accommodations section of
`/goals/[studentId]` that ends in a prefilled (never auto-saved) suggestion.

```
Add an "Ask for a suggestion" chat panel to the Accommodations section on
/goals/[studentId] (see docs/compliance.md's accommodation fields). Cap the
visible conversation at 5 exchanges to match the backend limit, and show a
clear turn counter. When the model proposes a concrete accommodation,
render it as a prefilled version of the *existing* add-accommodation form
(name, setting, implementationNotes) rather than a separate save path —
the teacher must review and submit through the existing
POST /api/student-accommodations flow. Include the same "AI unavailable —
add manually" fallback as Phase A2, and label suggested fields clearly as
AI-suggested pending review.
```

```
Run the same accessibility pass as Phase A2 on the chat panel: keyboard
operability of the whole conversation, aria-live announcements for new
model turns and errors, and readable-without-color status for "AI
unavailable" and "turn limit reached" states.
```

### Phase A5 — Verification and synthetic pilot

**Goal:** Confirm both features work end-to-end on synthetic data, exactly
like every other feature log in `docs/compliance.md`, before treating them
as done.

```
Run the full existing test suite (npm run test, npm run lint, npm run
build) plus the new AI-route unit tests from Phases A1/A3. Then, using
only synthetic students already in the dev database, exercise both
features end-to-end in the browser: complete the goal wizard for a
synthetic student and confirm the resulting goal is created (not
auto-created) only after explicit review/save; complete an accommodation
chat suggestion and confirm the same. Verify in each case that no request
sent to Anthropic (check via the redaction functions'/client's logging, or
a temporary debug log removed before merge) contains the student's real
display name or ID. Record the result in docs/compliance.md under a new
"AI-assisted features implementation log" entry, following the existing
log format used for every other phase in that file.
```

```
Update docs/compliance.md's Track A/Track B framing to explicitly state
that these two AI-assisted features carry the same synthetic-data-only
restriction as the rest of the app, plus the additional Anthropic-specific
blockers recorded in Phase A0 — so a future reader doesn't assume "Track B
sign-off for the base app" automatically covers the AI features too if the
Anthropic-specific items (data processing agreement, compliance officer
review of this specific vendor) are still open at that time.
```

---

## 5. What this plan deliberately does not do

- It does not add a new database table logging raw AI conversations. If
  that's wanted later (e.g., for quality review of suggestions), treat it as
  a new compliance-reviewed data category, not an implementation detail.
- It does not touch `/entry` or any time-pressured classroom-instruction
  screen — both features live on the already slower-paced
  `/goals/[studentId]` planning screen.
- It does not give the AI a write path to `goals`, `student_accommodations`,
  or any other table. Every save still goes through the existing,
  authorized, audited endpoints with an explicit human action in between.
- It does not resolve the district-level governance gaps (no named
  compliance officer, no Anthropic data processing agreement) — those are
  named as blockers for Track B, exactly as the rest of this app's real-data
  gate already is, not something this plan can close on its own.
