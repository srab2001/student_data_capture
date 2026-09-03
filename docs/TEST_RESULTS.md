# Test results

## Phase 1–2 production release — 2026-09-03

Environment: local macOS workspace and Vercel production, Next.js 16.3.3,
synthetic data only. Production alias:
https://iep-capture-pilot.vercel.app.

| Check | Result | Evidence |
|---|---|---|
| Unit tests | PASS | `npm test`: 4 files, 28 tests passed. Coverage includes event aggregation and compatibility, valid zero values, local dates, measurement-plan validation, schedule/role/effective-date evaluation, accuracy opportunity grouping, completed frequency windows, duration no-occurrence evidence, and legacy goals without plans. |
| ESLint | PASS | `npm run lint`: zero errors and zero warnings. |
| TypeScript | PASS | `npx tsc --noEmit`: exit 0 after the production build completed. A first parallel invocation collided with `.next` regeneration; see `docs/LESSONS_LEARNED.md`. |
| Production build | PASS | `npx next build --webpack`: compiled and type-checked successfully and generated all 20 application/API routes. Next emitted only the accepted unrelated-parent-lockfile warning. |
| Diff whitespace | PASS | `git diff --check`: no output. |
| Production dependency audit | PASS | `npm audit --omit=dev --audit-level=high`: zero vulnerabilities after approved registry access. |
| Migration metadata | PASS | `npx drizzle-kit check` with a non-secret placeholder URL: `Everything's fine`. |
| Production data guardrail | PASS | Before migration, the prototype login returned only Synthetic Teacher and Synthetic Aide; authenticated roster inspection returned eight students and every student had `isSynthetic: true`. No real-student records were found. |
| Migration execution | PASS after guarded recovery | The first migration-first deployment stopped before alias promotion because the manually created legacy schema had an empty Drizzle journal. The migrator was changed to record migrations `0000`–`0001` only after verifying all eight baseline tables and the append-only audit trigger; a genuinely empty database still follows the normal full migration path, while a partial baseline fails closed. Deployment `dpl_6DWUEXX1wJw1spUgAb6sSY4oPXiA` then journaled the verified baseline and applied `0002`, `0003`, and `0004` successfully. |
| Vercel deployment | PASS | Production deployment `dpl_6DWUEXX1wJw1spUgAb6sSY4oPXiA` reached `READY` and was aliased to https://iep-capture-pilot.vercel.app. The earlier failed deployment `dpl_GKP6QhUSyaCjm6AyiJGyXuAusd23` never replaced the prior production alias. |
| Public HTTP smoke | PASS | `/`, `/login`, and `/help` each returned HTTP 200 from the production alias. |
| Authenticated API smoke | PASS | `GET /api/auth/staff`, prototype teacher `POST /api/auth/login`, `GET /api/students`, and `GET /api/goals` each returned 200. The response contained eight synthetic students, 26 goals, and the migrated `measurementPlan` field on every goal. No write endpoint was invoked. |
| Chrome UI smoke | PASS | Signed in as Synthetic Teacher, loaded all eight roster cards, confirmed due-goal summaries and `Measurement plan incomplete` states for legacy goals, switched Card stack to Grid, verified semantic table and accessible control names, and opened Manage goals to verify all measurement-plan inputs and disabled-save safeguards. No student record was changed. |
| Runtime error-log scan | BLOCKED | The managed approval service rejected the Vercel log-read request. API and browser requests themselves showed no failure, but a post-test server-log scan was not available. |
| Full database write integration | NOT RUN | Idempotent POST, incompatible-event rejection, immutable PATCH, audited undo, populated-goal versioning, and rollback rehearsal still require a disposable synthetic database or an explicitly approved production write exercise. |
| Full ChromeOS/accessibility/offline matrix | NOT RUN | Offline/reconnect, rapid taps, timer segments, 200% zoom, screen reader, keyboard-only plan editing, and teacher/aide queue isolation remain manual follow-ups. |

## Release assessment

Phase 1 and Phase 2 are deployed and operational for the synthetic-data pilot.
Automated checks, guarded production migrations, read-only authenticated API
integration, and a Chrome UI smoke test pass. This does not authorize real
student data or broader district use. The remaining write-path, offline,
assistive-technology, runtime-log, and human timing scenarios stay open in
`docs/TEST_PLAN.md`.

## Earlier local verification

The 2026-09-02 Phase 1 run passed 16 unit tests, lint, TypeScript, webpack
production build, migration metadata, diff hygiene, and a production-only
dependency audit. The 2026-09-03 Phase 2 run expanded that suite to 28 tests
and added measurement-plan and evidence-unit coverage. Those local-only
results were superseded by the production evidence above without weakening
the remaining manual gates.

## Build-path notes

Local verification uses `npx next build --webpack` because Turbopack's CSS
worker cannot bind a local port in this managed sandbox. Vercel's native
Turbopack build completed successfully. The repository's normal `npm run
build` remains `next build`; migrations are an explicit deployment operation,
not a permanent build side effect.
