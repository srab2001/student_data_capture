# Compliance record

This file is the source of truth for what this app is allowed to do with
student data. Every later phase should be checked against it — anywhere
the implementation would deviate from what's recorded here, that's a bug,
not a judgment call to make silently.

This is a working record, not legal advice. HCPSS's own data privacy
officer and counsel must review and sign off before any real student data
touches this system, regardless of how complete this document is.

**Full plan and compliance review:**
https://claude.ai/code/artifact/f42a3d9c-ee1a-4b8d-860d-e8a4326da173

## Status

| | |
|---|---|
| **Authorized-systems status (Policy 3060)** | ❌ **Not approved.** Real, identifiable student data is prohibited in this system until HCPSS IT/privacy leadership signs off. |
| **Executive sponsor** | Not yet identified |
| **Data privacy & compliance officer** | Not yet identified |
| **IT / data systems lead** | Not yet identified |
| **Track** | A — prototype on synthetic data only |

## Data captured

- Accuracy/fluency probe results (`accuracy_pct`, `fluency_rate`)
- Behavior frequency & duration tallies (`frequency_count`, `duration_seconds`)
- Icon-degree readings — a configurable alternative to a plain tally
  (5-point smiley scale by default; stars, thumbs, or Zones-of-Regulation
  colors also supported per goal)
- ABC (antecedent-behavior-consequence) notes
- Prompt-level / independence tracking (`prompt_level`)
- Task analysis checklist steps (`task_analysis_step`)
- Accommodation-usage logs, including an effectiveness rating (rendered
  with the same icon-degree control as behavior goals)

No other fields should be added without updating this document first —
see "Data minimization" in the full compliance review.

## Classification

FERPA education record data. Because it is tied to IEP goals, it is also
IDEA-linked special education data — a category with handling
requirements beyond baseline FERPA.

## Legitimate educational interest

Today: the classroom teacher and their aide(s), scoped to their own
classroom roster only. No one else should have access. Widening this
(a case manager, a related-service provider, an administrator) is a new
access-control decision, not an assumption — see Phase 2/5 of the full
plan.

## State law overlay

Maryland layers state-level student data privacy requirements on top of
FERPA, alongside COMAR's special-education-specific rules. **Not yet
confirmed in detail** — flagged for HCPSS privacy officer/counsel review,
including whether the state's vendor/operator-style obligations reach a
personally-built app (Vercel + Neon) the way they would a purchased
product.

## Consent & notification

**Not yet decided.** Routine IEP progress monitoring is normally covered
by IDEA's existing procedural safeguards, but introducing a new
technology platform that stores this data is the kind of change a
privacy officer typically wants to review and may fold into parent
notification.

## Retention & deletion

**Not yet decided.** Should match HCPSS's records retention schedule for
special education records once the privacy officer confirms it. Every
table holding student-identifiable data uses soft deletes
(`deleted_at`), never hard deletes, so a retention policy can be enforced
later without losing audit history.

## Third-party / vendor exposure

- **Vercel** (hosting) and **Neon** (database) are themselves third
  parties the moment real student data touches them — this is the core
  of the Policy 3060 blocker above, not a separate issue.
- No analytics, error-tracking, or AI/voice-transcription service should
  ever receive real student data without its own explicit review.
- **No voice/audio capture is implemented in this app**, and none should
  be added without a separate sign-off — Maryland requires all-party
  consent to record a conversation, a second legal issue on top of
  everything above.

## Access control

Enforced in a single shared authorization helper (see Phase 2), not
inline checks scattered across routes:

- `teacher` — full access to their own classroom's students only
- `aide` — same classroom scope as their assigned teacher; can create
  entries but not edit or delete another staff member's past entries

Every read and write is audit-logged (`audit_log` table), and that table
is not deletable from the application, including by a future admin role.

## Synthetic data only, until sign-off

- Every student row carries an `is_synthetic` flag.
- Seed scripts refuse to run against anything that looks like a
  production database URL.
- The pre-commit hook (`.githooks/pre-commit`) blocks common PII
  patterns as a safety net.

None of this replaces the actual sign-off recorded in the Status table
above.

## Phase 0 infrastructure log

Provisioned 2026-08-28, on synthetic data only, no Policy 3060 sign-off:

| Piece | Status | Notes |
|---|---|---|
| **Vercel project** | ✅ Deployed | `iep-capture-pilot`, production alias `iep-capture-pilot.vercel.app`. File-based deploy (not git-linked yet — see GitHub row). |
| **Neon database** | ✅ Created | Dev branch project `iep-capture-pilot-dev` (`crimson-flower-01823647`, region `us-east-1`). Empty — no schema applied yet, that's Phase 1. Connection string lives only in the local, git-ignored `.env.local`; it is **not yet set as a Vercel environment variable** — no schema exists for it to serve yet, so the app doesn't need it in production until Phase 1/2. |
| **GitHub repo** | ⛔ Not pushed | This build environment's GitHub access is scoped to a pre-configured allowlist of repos and cannot create or list new ones. The commit exists locally (`f61504e`); pushing it requires the human owner to create the repo under their own GitHub account and push from a machine with real access, or to configure this environment's GitHub access first. |

This row will be updated as each piece moves from prototype to reviewed.
