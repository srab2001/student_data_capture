# IEP Capture Pilot

A single-classroom prototype for Howard County Public Schools (HCPSS) special
education IEP progress-data capture — replacing spreadsheet entry with fast,
in-classroom logging so teachers and aides spend more time with students.

Built independently by a teacher using [Claude Code](https://claude.com/claude-code),
**not yet reviewed by HCPSS IT or the district's data privacy office.**

Full plan, compliance review, and phase-by-phase build instructions:
[IEP Capture Pilot — artifact](https://claude.ai/code/artifact/f42a3d9c-ee1a-4b8d-860d-e8a4326da173)

## ⚠️ FERPA / student data notice

This repo is designed to eventually hold data protected by FERPA and IDEA
(IEP progress data on identifiable students). **During this prototype
phase, it must only ever contain synthetic/fake data.**

Do not commit, seed, or log real student names, IDs, or any other
identifying details until:

1. HCPSS's data privacy officer has reviewed and signed off, and
2. HCPSS IT/privacy leadership has confirmed this system satisfies
   Board Policy 3060's "Authorized Systems Only" requirement.

See [`docs/compliance.md`](./docs/compliance.md) for the full data
classification, open compliance questions, and current sign-off status.
A pre-commit hook (`.githooks/pre-commit`) blocks commits that match
common PII patterns as a safety net — it is not a substitute for the
sign-off above.

## Two tracks

- **Track A (now):** build and test everything against synthetic data.
  No sign-off needed.
- **Track B (gated):** flipping on real student data. Requires a named
  executive sponsor and privacy officer sign-off — see the compliance
  doc and the personnel roster in the full plan.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your dev Neon connection string
git config core.hooksPath .githooks
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Neon](https://neon.tech) (serverless Postgres) — dev branch only during
  the prototype phase
- [Vercel](https://vercel.com) — deployment
