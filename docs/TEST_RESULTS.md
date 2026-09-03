# Test results

## Phase 3 classroom-workflow production release — 2026-09-03

Environment: local macOS workspace and Vercel production, Next.js 16.3.3,
synthetic data only. Production alias:
https://iep-capture-pilot.vercel.app.

| Check | Result | Evidence |
|---|---|---|
| Unit tests | PASS | `npm test`: 5 files, 36 tests passed. Eight Phase 3 cases cover stable roster-order filtering, stale-group fallback, forward/backward focus wrapping, empty rosters, unique group membership, and accepted/rejected staff preference values. All 28 Phase 1–2 tests remain green. |
| ESLint | PASS | `npm run lint`: zero errors and zero warnings. |
| TypeScript | PASS | `npx tsc --noEmit`: exit 0 after extending the intentional audit allowlist and using the established async route-params type. |
| Production build | PASS | `npx next build --webpack`: compiled and type-checked successfully and generated 22 application/API routes, including `/api/entry-preferences` and both roster-group routes. The accepted parent-lockfile warning remains. |
| React best-practices review | PASS | Reviewed client request parallelism, shared state ownership, versioned local storage, serialized preference writes, stale-response status handling, derived focus state, stable list keys, client boundaries, and semantic controls. No blocking issue remained. |
| Security code review | PASS | New routes use signed-session authentication, teacher-only mutations, classroom-scoped parameterized Drizzle queries, strict bounded Zod bodies/path IDs, rate limits, soft deletion, and audit records. Out-of-classroom group IDs follow the same 404 path as missing groups. No hardcoded secret, raw SQL, HTML injection, or new authentication mechanism was added. |
| Neon transaction compatibility | PASS for group writes; goal-version execution pending | Runtime source review confirmed Neon HTTP rejects interactive `db.transaction`. Phase 3 group create/update/retire executed successfully through supported atomic `db.batch` requests in production. The replacement Phase 2 goal-version batch is deployed and compiles, but was not invoked against an observed goal. |
| Accessibility code review | PASS with browser gate | Workflow/layout controls use native radios, filters use labeled selects, group membership uses labeled 44px checkbox rows, Focus navigation is a named group, timer actions include student/goal-specific names, preference/save states are announced, and segmented controls have visible keyboard focus. Zoom and screen-reader behavior remain a browser gate. |
| Migration generation | PASS | Drizzle generated `0005_colorful_clea.sql` plus snapshot/journal metadata. It adds nullable staff entry preferences, classroom-scoped roster groups, soft-deletable membership rows, foreign keys, and lookup indexes without altering existing observations. |
| Migration metadata | PASS | `npx drizzle-kit check` with a non-secret placeholder URL: `Everything's fine`. |
| Production dependency audit | PASS | `npm audit --omit=dev --audit-level=high`: zero vulnerabilities after the sandboxed request hit the known registry restriction and was rerun with approved read access. No dependencies changed in Phase 3. |
| Production data guardrail | PASS | Before migration, the prototype picker returned two staff accounts and the authenticated roster returned eight students; every student had `isSynthetic: true`. |
| Migration execution | PASS in synthetic production; rehearsal pending | The guarded Vercel build applied `0005_colorful_clea.sql` and printed `Migrations complete` before compiling. Fresh-database, disposable-branch upgrade, and rollback/discard rehearsals remain unrun. The deployment used the configured pooled URL because no dedicated unpooled migration variable is available; see `docs/LESSONS_LEARNED.md`. |
| Vercel deployment | PASS | Migration-first deployment `dpl_4xUDdv7586vRJiRtirnRE8kdK4A4` reached `READY`, generated all 22 routes, and applied `0005`. After source commit `8a63a6d` was pushed, Git-linked deployment `dpl_BMLKXmpENs8zLNi63fEFVwhHxqtL` also reached `READY` and received the https://iep-capture-pilot.vercel.app alias. |
| Credentialed group API integration | PASS with scoped gaps | Teacher create returned 201, update 200, case-insensitive duplicate protection 409, and retire 200. Aide list returned 200 while create/update/delete each returned 403. The retired group disappeared from both roles' active results. Cross-classroom rejection and direct audit-row inspection remain unrun because production has one synthetic classroom and no database inspection credential. |
| Credentialed preference API integration | PASS | Teacher and aide saved different valid layout/workflow/group preferences, and subsequent GETs restored each role's exact values. After the browser run, both accounts were reset to Card stack/Roster/All students and verified with 200 responses. |
| Chrome UI smoke | PASS with scoped gaps | Synthetic Teacher restored Focus and the two-student group; Next advanced and wrapped; switching to Timers announced `Preferences saved`; reload restored Timers and its intentional no-duration empty state. Synthetic Aide restored its independent Timers/Grid preference, could use the shared group, and had no group-management control. Retiring the selected group then reloading fell back to All students while preserving the aide's layout. The page contained meaningful content and no Next/Vite error overlay. No observation was recorded. |
| Runtime error-log scan | PASS | `vercel logs dpl_4xUDdv7586vRJiRtirnRE8kdK4A4 --level error --since 1h --limit 100 --json` returned no error entries after the API/browser run. |
| Browser/ChromeOS/accessibility matrix | PARTIAL | Native radio/select/button/table semantics and specific control names were present in Chrome's accessibility tree. The seed contains no active duration goal, so timer Start/Stop/No occurrence was not exercised. 1366×768, 200% zoom, keyboard-only, screen reader, active-timer continuity, offline/reconnect, and second-device preference tests remain manual gates. |

### Phase 3 assessment

Phase 3 is deployed and operational for the synthetic-data pilot. The guarded
migration, role-scoped group writes, independent preference restoration,
stale-group recovery, Chrome smoke, and runtime error scan pass. This does not
authorize real student data or broader district use. Cross-classroom, direct
audit inspection, populated-goal versioning, disposable migration rehearsal,
duration-timer, offline, and assistive-technology gates remain open.

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
| Full database write integration | PARTIAL; remaining scenarios open | Phase 3 group and preference writes passed in production. Idempotent observation POST, incompatible-event rejection, immutable PATCH, audited undo, populated-goal versioning, and rollback rehearsal were not run. The unsupported goal-version transaction primitive is replaced and deployed, but its populated-goal execution remains a disposable-database gate. |
| Full ChromeOS/accessibility/offline matrix | NOT RUN | Offline/reconnect, rapid taps, timer segments, 200% zoom, screen reader, keyboard-only plan editing, and teacher/aide queue isolation remain manual follow-ups. |

## Release assessment

Phases 1–3 are deployed and operational for the synthetic-data pilot.
Automated checks, guarded production migrations, scoped authenticated API
integration, Chrome UI smoke, and the post-test runtime error scan pass. This
does not authorize real student data or broader district use. The remaining
observation/goal write-path, cross-classroom, rollback, duration-timer,
offline, assistive-technology, and human timing scenarios stay open in
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
