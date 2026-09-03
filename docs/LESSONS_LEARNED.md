# Lessons learned

## 2026-09-03 — Initial admin audit loading should not synchronously set effect state

- **Observed symptom:** ESLint reported `react-hooks/set-state-in-effect` when
  the audit-history effect called a loader that immediately enabled its loading
  state.
- **Root cause:** The same loader handled both initial mount and a user-triggered
  refresh, even though the initial state could already represent loading.
- **Resolution:** Initialized the screen as loading, limited the shared loader
  to asynchronous completion updates, and moved the refresh-start transition to
  the button event handler.
- **Prevention:** Model initial async state in the state initializer and reserve
  synchronous loading transitions for explicit user events.
- **Status:** Resolved.

## 2026-09-03 — Schema generation still requires a URL-shaped environment value

- **Observed symptom:** `npm run db:generate` stopped with `DATABASE_URL is not
  set` before producing migration metadata.
- **Root cause:** The Drizzle configuration loads the application database
  module even though diff generation does not connect to the database.
- **Resolution:** Re-ran generation with a non-secret placeholder PostgreSQL URL;
  `0009`–`0010` and their snapshots were generated, then metadata validation
  passed.
- **Prevention:** Use the documented placeholder only for schema-only generation
  and never present it as a successful database connection.
- **Status:** Resolved.

## 2026-09-03 — Due filtering must remain a pure render calculation

- **Observed symptom:** React lint flagged the first Due today implementation
  for calling a ref-backed entry action, and therefore time-dependent code,
  during render.
- **Root cause:** The filtering code reused an imperative action intended for
  event handlers instead of the pure measurement-plan helper.
- **Resolution:** The screen captures its local date once with a lazy state
  initializer and derives due status directly from the goal plan and signed-in
  role. Lint, types, and production build pass.
- **Prevention:** Keep render-time status derivation pure; reserve action refs
  for user events and asynchronous effects.
- **Status:** Resolved.

## 2026-09-03 — Local browser verification needs both auth and database secrets

- **Observed symptom:** The first local login shell lacked `AUTH_SECRET`; after
  supplying a disposable local-only value, `/api/auth/staff` still returned a
  safe server error because `DATABASE_URL` is unavailable on this host.
- **Root cause:** Authenticated pages depend on the synthetic database, and the
  scoped connector credential cannot be safely injected into the local process.
- **Resolution:** Public home/help smoke tests passed with the temporary auth
  value. Authenticated workflow testing was left open instead of writing a
  credential to disk or testing against production.
- **Prevention:** Provide a secret-safe disposable-preview test environment for
  browser runs and fail closed whenever either variable is absent.
- **Status:** Public smoke resolved; authenticated browser verification blocked
  until a disposable synthetic database connection is available.

## 2026-09-03 — Preferred browser automation was unavailable

- **Observed symptom:** The repository's preferred `agent-browser` command was
  not installed in the execution environment.
- **Root cause:** The optional browser CLI is not part of this host image.
- **Resolution:** Used the in-app Chromium automation surface for the bounded
  public-page smoke test and documented the substitution.
- **Prevention:** Check browser-runner availability before starting a local
  server; keep equivalent accessibility assertions independent of one runner.
- **Status:** Accepted environment limitation.

## 2026-09-03 — Turbopack build workers cannot bind a port on this host

- **Observed symptom:** `npm run build` failed while processing `app/globals.css`
  with `creating new process` / `binding to a port` / `Operation not permitted`.
  An approved unrestricted retry produced the same error.
- **Root cause:** This host blocks the internal port Turbopack's CSS worker tries
  to bind; no application TypeScript or CSS diagnostic was reported.
- **Resolution:** Ran `npx next build --webpack`; compilation, TypeScript, page
  generation, and route collection all passed.
- **Prevention:** Keep the webpack build as the fallback release check on this
  host and still run the normal Vercel build before deployment.
- **Status:** Accepted local-environment limitation; application build resolved.

## 2026-09-03 — Network-dependent audits require the approved network path

- **Observed symptom:** The first production dependency audit returned
  `getaddrinfo ENOTFOUND registry.npmjs.org`.
- **Root cause:** The default command sandbox blocks the npm advisory endpoint.
- **Resolution:** Re-ran the identical read-only audit through the approved
  network path; it reported zero vulnerabilities.
- **Prevention:** Treat a registry DNS failure as an environment result, request
  the narrow `npm audit` permission, and never report it as an application pass
  until the real advisory response is received.
- **Status:** Resolved.

## 2026-09-03 — Disposable database URLs should not be copied into project files

- **Observed symptom:** A local migration command could not receive the
  connector-returned disposable `DATABASE_URL` and stopped with the documented
  missing-variable error.
- **Root cause:** The command runner does not provide a safe secret-valued
  environment bridge from the database connector.
- **Resolution:** Executed the idempotent migration statements and round-trip
  checks through the scoped Neon connector on the named disposable branch. No
  credential was printed or written to disk.
- **Prevention:** Prefer connector-native SQL for ephemeral schema rehearsals;
  use the platform's configured environment for the final migration-first
  deployment.
- **Status:** Resolved for schema verification; full migrator execution remains
  a production/preview release gate.

## 2026-09-03 — Treat each special-education measure as a typed collection protocol

- **Observation:** Labels such as “behavior data” or “academic data” are not
  interchangeable storage types. Frequency, duration, latency, rubric scores,
  and ABC observations need different controls, validation, and reporting.
- **Impact:** Combining duration and latency or storing ABC fields in one note
  would make later review ambiguous and could silently change what an IEP goal
  means.
- **Resolution:** Added distinct metric/event enums, a discriminated structured
  details object for rubric/ABC events, and versioned rubric and prompt
  configuration on the goal. Existing goal-versioning rules apply whenever
  those definitions change.
- **Prevention:** Before adding a measure, document its observable unit, required
  context, valid range/categories, aggregation rule, and display/export form.

## 2026-09-03 — An accommodation picker must come from the student's active plan

- **Observation:** A shared hard-coded list lets staff log supports that are not
  assigned to the selected student and provides no implementation setting.
- **Impact:** That creates misleading access data even when the UI is easy to use.
- **Resolution:** Added classroom-scoped, soft-deletable student accommodation
  assignments with setting and directions. The entry API rejects a support that
  is not active for that student; historical use logs remain intact.
- **Prevention:** Validate student-specific configuration again on the server,
  never only by filtering a client-side menu.

Append-only operational record. Do not include credentials or student data.

## 2026-09-02 — Dependency installation initially had no network

- **Context:** Preparing the Phase 1 implementation and loading the installed
  Next.js 16 documentation required by `AGENTS.md`.
- **Symptom:** `npm install` failed with `ENOTFOUND registry.npmjs.org`.
- **Root cause:** Managed sandbox DNS/network restriction.
- **Resolution:** Re-ran the locked install with approved network access.
- **Prevention:** Expect a network approval when a fresh checkout has no
  `node_modules`; keep the lockfile authoritative.
- **Status:** Resolved.

## 2026-09-02 — npm pruned cross-platform optional lock entries

- **Context:** Installing dependencies on macOS.
- **Symptom:** `package-lock.json` lost approximately 500 lines of optional
  non-host esbuild package metadata.
- **Root cause:** npm normalized platform-specific optional packages for the
  current host. A package-lock-only retry with the default cache also hit an
  `EPERM` cache ownership error; a task-specific `/tmp` cache avoided that
  separate issue but npm retained the normalized result.
- **Resolution:** Accepted the lock normalization because resolved dependency
  versions did not change and all builds/tests use the resulting lockfile.
- **Prevention:** Use a consistent npm version and CI-generated lockfiles; use
  a task-specific cache in managed environments.
- **Status:** Accepted limitation.

## 2026-09-02 — Initial Vitest run could not resolve the TypeScript alias

- **Context:** First execution of the new unit suite.
- **Symptom:** Both suites failed before collection with `Cannot find package
  '@/lib/...'`.
- **Root cause:** Vitest did not inherit the Next.js `@` alias automatically.
- **Resolution:** Added `vitest.config.mts` with an explicit repository-root
  alias. Renaming from `.ts` to `.mts` also removed Vite's CommonJS/ESM loader
  warning.
- **Prevention:** Add test-runner path-alias configuration with the first test
  harness in Next.js projects.
- **Status:** Resolved.

## 2026-09-02 — Default Turbopack build is incompatible with this sandbox

- **Context:** Production build verification.
- **Symptom:** First build could not fetch Caprasimo/Figtree; the approved
  network retry then panicked while PostCSS tried to create a process and bind
  a local port (`Operation not permitted`).
- **Root cause:** The first failure was restricted network access. The second
  was a managed-sandbox restriction in Turbopack's CSS worker, not a source or
  type error.
- **Resolution:** `npx next build --webpack` completed successfully, including
  compilation, TypeScript, page generation, and route collection.
- **Prevention:** Use the webpack build path for local verification in this
  sandbox; retain the normal build in CI/Vercel where Turbopack workers are
  supported.
- **Status:** Resolved for local verification.

## 2026-09-02 — Development-only esbuild advisories have no non-breaking fix

- **Context:** Dependency security audit.
- **Symptom:** Full `npm audit` reports four moderate findings through an old
  esbuild chain used by `drizzle-kit`; `npm audit --omit=dev` reports zero.
- **Root cause:** The current Drizzle tooling dependency chain.
- **Resolution:** Did not run `npm audit fix --force` because npm proposes a
  breaking downgrade to `drizzle-kit@0.18.1`.
- **Prevention:** Track Drizzle toolchain releases and retest when a compatible
  dependency removes the advisory.
- **Status:** Open, development-only.

## 2026-09-02 — Database and browser checks require a migrated dev branch

- **Context:** End-to-end verification of event writes, retries, and undo.
- **Symptom:** This checkout has no `.env.local`; new code expects schema from
  migrations `0002`, `0003`, and `0004`.
- **Root cause:** Development database credentials are intentionally absent
  from the cloned repository.
- **Resolution:** Generated/reviewed the migration and documented the exact
  integration/browser test gate. No production or external database was
  changed.
- **Prevention:** Provision an isolated synthetic-data Neon branch for pull
  request integration tests.
- **Status:** Blocked pending a disposable development database.

## 2026-09-03 — Note synchronization initially used a state-setting effect

- **Context:** Ensuring an undone note refreshes the visible textarea.
- **Symptom:** ESLint rejected a synchronous `setState` inside `useEffect`
  under `react-hooks/set-state-in-effect`.
- **Root cause:** Local draft state was being synchronized from a derived prop
  using an effect, causing an avoidable render cascade.
- **Resolution:** Kept the textarea uncontrolled and keyed it by the saved note
  value, so it remounts only when the underlying saved/undone note changes.
- **Prevention:** Prefer keyed uncontrolled inputs or event-driven state resets
  over prop-to-state synchronization effects.
- **Status:** Resolved.

## 2026-09-03 — Raw occurrence counts initially overstated evidence sufficiency

- **Context:** First Phase 2 implementation of per-goal evidence status.
- **Symptom:** A frequency tally could satisfy `observationsRequired` even
  though it represented a behavior occurrence, not completion of the planned
  observation window. A zero-occurrence window had no event at all.
- **Root cause:** The initial helper treated every non-note event as an equal
  measurement sample despite metric-specific collection semantics.
- **Resolution:** Added metric-aware evidence units: accuracy groups trials by
  configured opportunities, frequency requires `observation_complete`, and
  duration accepts either a stopped interval or explicit no-occurrence event.
- **Prevention:** Define the evidence unit for each metric before implementing
  schedule compliance or sufficiency calculations; always test valid zeros.
- **Status:** Resolved.

## 2026-09-03 — Installed Next.js documentation paths differed from the expected guide path

- **Context:** Loading the repository-required local Next.js route-handler and
  server/client component guidance before Phase 2 edits.
- **Symptom:** The first `cat` used an older nested documentation path and
  returned `No such file or directory`.
- **Root cause:** Next.js 16.3.3 stores these guides under
  `dist/docs/01-app/01-getting-started/` in this installation.
- **Resolution:** Discovered the installed files first, then read the matching
  local guides completely before implementation.
- **Prevention:** Use `find`/`rg --files` against the installed docs instead of
  assuming a version-specific path.
- **Status:** Resolved.

## 2026-09-03 — Production build found an unrelated parent lockfile

- **Context:** Phase 2 webpack production-build verification.
- **Symptom:** Next.js warned that it ignored
  `/Users/stuart.rabinowitz/.claude/repositories/package-lock.json` because it
  is outside this Git repository.
- **Root cause:** The shared workspace parent contains a separate lockfile;
  this repository also has its own lockfile and built successfully.
- **Resolution:** No code change; Next correctly ignored the unrelated parent
  file and completed compilation, type-checking, and route generation.
- **Prevention:** Keep project commands rooted in this repository. Configure
  `outputFileTracingRoot` only if future deployment tracing demonstrates an
  actual monorepo need.
- **Status:** Accepted limitation.

## 2026-09-03 — Security audit initially lacked registry access

- **Context:** Phase 2 production dependency verification.
- **Symptom:** The sandboxed audit returned `ENOTFOUND registry.npmjs.org` and
  could not write its usual npm log outside the workspace.
- **Root cause:** Managed network and filesystem restrictions.
- **Resolution:** Re-ran the read-only production audit with approved registry
  access; it reported zero vulnerabilities. The same restriction recurred
  during the Phase 3 final gate and the approved retry again reported zero
  vulnerabilities.
- **Prevention:** Expect explicit registry access for fresh advisory data in
  managed workspaces and keep audit output free of credentials.
- **Status:** Resolved.

## 2026-09-03 — Sensitive production credentials could not be pulled locally

- **Context:** Applying the Phase 1–2 migrations before switching the Vercel
  production alias.
- **Symptom:** `vercel env pull` preserved `DATABASE_URL` as a masked
  placeholder, so a local migration process could not connect.
- **Root cause:** Vercel correctly prevents retrieval of sensitive environment
  variable values.
- **Resolution:** Temporarily made migration an explicit pre-build step in the
  remote production build, where the real variable is available. Vercel kept
  the old alias live unless migration and build both succeeded. Restored the
  normal build-only command immediately after migration.
- **Prevention:** Use a dedicated migration job or deployment pipeline with
  scoped credentials; never weaken secret visibility to make local tooling
  convenient.
- **Status:** Resolved for this release; dedicated migration automation remains
  a future operational improvement.

## 2026-09-03 — The legacy schema had no Drizzle migration history

- **Context:** First production attempt to apply migrations `0002`–`0004`.
- **Symptom:** Deployment `dpl_GKP6QhUSyaCjm6AyiJGyXuAusd23` failed when
  Drizzle attempted migration `0000` and PostgreSQL reported that the existing
  `goal_domain` type already existed.
- **Root cause:** The original schema and audit trigger had been applied
  manually, but `drizzle.__drizzle_migrations` was empty.
- **Resolution:** Added a guarded reconciliation in `scripts/migrate.ts`. It
  records only baseline migrations `0000`–`0001`, and only after verifying all
  eight expected tables and the append-only audit trigger. A genuinely empty
  database is left for the normal full migration sequence; any partial or
  unknown baseline fails closed. The next deployment journaled the baseline,
  applied `0002`–`0004`, built, and promoted successfully.
- **Prevention:** Establish and verify migration history when adopting a
  migration tool around an existing schema; rehearse it on a disposable branch
  before the next schema release.
- **Status:** Resolved.

## 2026-09-03 — Parallel build and standalone TypeScript checks shared `.next`

- **Context:** Running independent local quality gates concurrently after the
  deployment.
- **Symptom:** `npx tsc --noEmit` briefly reported missing files beneath
  `.next/types` while `next build` was regenerating that directory.
- **Root cause:** Both commands read or replace the same generated Next.js type
  tree and are not independent when run in the same checkout.
- **Resolution:** Re-ran TypeScript after the build completed; it exited 0.
- **Prevention:** Run standalone TypeScript after `next build`, or give parallel
  checks isolated worktrees/output directories.
- **Status:** Resolved.

## 2026-09-03 — Post-deployment runtime-log inspection was denied

- **Context:** Final production error and HTTP 500 scan after API/browser smoke
  tests.
- **Symptom:** The managed approval service rejected the read-only Vercel logs
  request before the CLI ran.
- **Root cause:** External tool approval failed; no application error caused
  the rejection.
- **Resolution:** Did not bypass the control. Recorded the runtime-log scan as
  blocked while retaining direct HTTP, authenticated API, browser, build, and
  deployment evidence. During the Phase 3 release, the same read-only scan was
  approved and returned no error entries in the one-hour post-test window.
- **Prevention:** Run the log scan from an approved operator session or CI
  release job and attach the result to the next verification record.
- **Status:** Resolved during the Phase 3 production release.

## 2026-09-03 — New workflow routes exceeded two compile-time registries

- **Context:** First TypeScript pass for Phase 3 roster groups and staff
  preferences.
- **Symptom:** New audit table names were rejected by `recordAudit`, and the
  generated `RouteContext` union did not yet contain the newly added dynamic
  roster-group route.
- **Root cause:** The audit helper uses an intentional table-name allowlist,
  and `.next/types` reflected the routes from the previous build.
- **Resolution:** Extended the audit allowlist for the two approved workflow
  records and used the repository's existing explicit async `params` type for
  dynamic routes. No authorization check was removed.
- **Prevention:** Update bounded audit registries with each approved schema
  addition, and do not depend on generated route unions until type generation
  has run for a newly created route.
- **Status:** Resolved.

## 2026-09-03 — Markdown search backticks were interpreted by the shell

- **Context:** Scanning all documentation for stale Phase 2 release language.
- **Symptom:** Backticked migration names inside a double-quoted `rg` pattern
  were treated as shell command substitutions, producing harmless `command not
  found` messages.
- **Root cause:** The search expression used shell-significant quoting.
- **Resolution:** No files were changed and no sensitive output was produced;
  subsequent searches use single-quoted literal patterns or omit backticks.
- **Prevention:** Keep Markdown backticks inside single-quoted shell arguments
  and avoid interpolated search expressions.
- **Status:** Resolved. The same quoting mistake recurred during the Phase 4
  release-document scan; the command was immediately rerun with a single-quoted
  pattern, again without file changes or sensitive output.

## 2026-09-03 — Roster-group path IDs needed explicit scope-safe validation

- **Context:** Phase 3 security review of the new group update/retire route.
- **Symptom:** A malformed path ID could reach PostgreSQL and become a 500,
  while a valid group ID from another classroom produced 403 and therefore
  revealed that the record existed.
- **Root cause:** The first route draft loaded by ID and applied classroom scope
  as a second step.
- **Resolution:** Validate the path parameter as a UUID and include the signed-
  in classroom in the lookup itself. Missing and out-of-scope groups now share
  the same 404 path; membership writes retain their separate classroom checks.
- **Prevention:** Treat path parameters as request data, validate before query,
  and make tenant/classroom scope part of the record lookup rather than a
  post-query assertion.
- **Status:** Resolved.

## 2026-09-03 — Neon HTTP does not support interactive Drizzle transactions

- **Context:** Runtime-oriented review of Phase 3 group mutations and the
  existing Phase 2 goal-versioning path.
- **Symptom:** The code compiled, but `db.transaction(async ...)` in the
  installed `drizzle-orm/neon-http` driver unconditionally throws `No
  transactions support in neon-http driver` at runtime.
- **Root cause:** Interactive transaction syntax was written against the base
  Drizzle API without checking the selected driver's runtime implementation.
- **Resolution:** Replaced interactive transactions with `db.batch([...])`,
  which the Neon HTTP driver executes through its atomic transaction endpoint.
  IDs are generated before the batch so inserts and dependent writes remain in
  one atomic request. This fixes Phase 3 group mutations and the previously
  untested Phase 2 goal replacement/retirement operation.
- **Prevention:** Check driver-specific transaction support before choosing a
  transaction primitive and add credentialed write-path integration tests; a
  successful TypeScript/build result cannot prove driver runtime support.
- **Status:** Resolved and deployed. Phase 3 group batches executed
  successfully in production; direct populated-goal versioning execution is a
  separate remaining test gap.

## 2026-09-03 — Production migration used the pooled application URL

- **Context:** Phase 3 migration-first Vercel production deployment.
- **Symptom:** The migration completed, but its redacted host classification
  showed that `DATABASE_URL` points to Neon's pooled endpoint rather than a
  dedicated direct migration endpoint.
- **Root cause:** The Vercel project currently exposes the application URL to
  the migration script and has no separate `DATABASE_URL_UNPOOLED` variable.
- **Resolution:** Drizzle's Neon HTTP migrator completed `0005` successfully,
  the 22-route build reached `READY`, and the new APIs passed credentialed
  writes. No credential or hostname was recorded in documentation.
- **Prevention:** Add a Vercel-only unpooled migration secret and update the
  migration runner to prefer it before the next schema release.
- **Status:** Open configuration-hardening item; this release succeeded.

## 2026-09-03 — Production seed could not exercise duration timer controls

- **Context:** Phase 3 production Chrome verification of Timers mode.
- **Symptom:** The active synthetic goals contained no duration metric, so the
  designed empty state rendered but Start, Stop, No occurrence, and active-
  timer continuity could not be exercised.
- **Root cause:** The production synthetic seed did not guarantee at least one
  active goal for every metric type.
- **Resolution:** Verified the empty state, preference restoration, and no
  framework error overlay without inventing or retaining extra instructional
  data in the shared pilot.
- **Prevention:** Make disposable integration fixtures deterministic across
  metric types and run timer stories on an isolated database branch.
- **Status:** Open test-data gap.

## 2026-09-03 — Compliance-document patch used an incorrect absolute path

- **Context:** Synchronizing release documentation after Phase 3 deployment.
- **Symptom:** The first `apply_patch` call failed before editing because the
  absolute workspace path omitted part of the macOS user directory name.
- **Root cause:** Manual path transcription error.
- **Resolution:** Reissued the patch with the verified repository path; the
  failed call made no file changes.
- **Prevention:** Reuse the working-directory path returned by `pwd` for
  absolute patch targets.
- **Status:** Resolved.

## 2026-09-03 — Narrative mastery criteria are not safe numeric targets

- **Context:** Phase 4 aim-line reporting for special-education progress data.
- **Symptom:** The existing schema held baseline and mastery criterion as
  narrative text, while an aim line requires numeric values, dates, and a
  direction.
- **Root cause:** Valid IEP language is intentionally flexible and may describe
  conditions, opportunities, consecutive probes, prompt levels, or duration;
  parsing a number from that text would discard meaning and could fabricate a
  target the team never approved.
- **Resolution:** Added an optional, explicitly teacher-entered quantitative
  target. Existing goals remain null, categorical metrics reject targets, and
  the UI states that narrative criteria are never converted automatically.
- **Prevention:** Treat derived educational judgments as new data requiring a
  named source and validation, not as a convenience transformation.
- **Status:** Resolved in local Phase 4 code; database/browser release gate open.

## 2026-09-03 — One generic sparkline misrepresented categorical evidence

- **Context:** Phase 4 summary redesign across numeric, prompt-level, icon, and
  accommodation-used metrics.
- **Symptom:** The old detail assumed every goal could use a numeric sparkline;
  categorical goals either produced an empty graphic or invited arbitrary
  numeric ordering and spacing.
- **Root cause:** Presentation followed component reuse rather than the metric's
  measurement scale.
- **Resolution:** Numeric metrics now use dated values with an optional dashed
  aim line. Categorical metrics use labeled counts. A visible value table, SVG
  title/description, text legend, and intervention list preserve access without
  depending on color or a chart alone.
- **Prevention:** Choose visual encodings from the data scale first; do not
  coerce categories into numbers to reuse a chart.
- **Status:** Resolved in code; assistive-technology and zoom checks remain open.

## 2026-09-03 — Synthetic fixtures must guarantee every critical metric

- **Context:** Phase 4 followed the Phase 3 production Timers test gap.
- **Symptom:** Random goal selection could omit duration goals entirely, making
  core timer and duration-chart stories impossible to execute.
- **Root cause:** A realistic random seed was being used as an acceptance-test
  fixture without minimum coverage guarantees.
- **Resolution:** New synthetic seeds guarantee a duration goal for the first
  student and include explicit quantitative targets plus an intervention marker.
  The existing production seed remains unchanged until a gated release.
- **Prevention:** Keep variation for realism only after deterministically
  including every critical metric and role path needed by release tests.
- **Status:** Resolved for future seeds; current production fixture gap remains.

## 2026-09-03 — Parse secret-bearing connector output before JSON serialization

- **Context:** Starting the local app against the disposable Neon migration
  branch without printing its connection string.
- **Symptom:** The first local request returned 500 because the stored database
  URL contained JSON escape syntax and was rejected as an invalid URL.
- **Root cause:** The connector result was serialized before extracting the
  `URI:` value, so representation escaping became part of the secret.
- **Resolution:** Stopped the server, extracted the URI directly from the text
  content in memory, and restarted without emitting the credential. All later
  API and browser calls succeeded.
- **Prevention:** Extract structured secret values from their original content,
  validate only their non-secret shape, and never round-trip them through a
  rendered JSON representation.
- **Status:** Resolved; no secret was written to the repository or test output.

## 2026-09-03 — Legacy null plans cannot exercise target-only versioning

- **Context:** The first Phase 4 API rehearsal attempted to add a progress
  target to an inherited goal.
- **Symptom:** The target PATCH correctly returned 400 instead of creating a
  version.
- **Root cause:** Pre-Phase 2 goals intentionally have null measurement plans,
  while every newly written goal version must contain a complete plan.
- **Resolution:** The integration script now creates a complete synthetic goal,
  records an observation, and then changes its target to exercise populated-goal
  versioning without inventing fields for legacy records.
- **Prevention:** Build migration/API fixtures from the current write contract;
  use legacy rows only to verify backward-compatible reads and null preservation.
- **Status:** Resolved in `scripts/verify-phase4-api.ts`.

## 2026-09-03 — Compliance assertions must match the requested date range

- **Context:** The Phase 4 integration fixture recorded one observation on one
  scheduled Wednesday.
- **Symptom:** A full-calendar-year summary reported roughly 2% compliance,
  while the initial test expected 100%.
- **Root cause:** The application correctly counted every scheduled Wednesday
  in the requested range; the test expectation accidentally described a
  one-day range.
- **Resolution:** Kept the full-year request for synthetic-data guard checks and
  used a one-day range for the exact 1/1 compliance assertion, CSV, and print.
- **Prevention:** State the reporting interval beside every expected compliance
  value and derive expectations from scheduled opportunities in that interval.
- **Status:** Resolved; both 20% over the browser's 30-day range and 100% for the
  single scheduled day were observed as expected.

## 2026-09-03 — Browser verification needs a documented fallback

- **Context:** The Phase 4 local server triggered the preferred automated
  browser-verification workflow.
- **Symptom:** The `agent-browser` CLI was not installed in this workspace.
- **Root cause:** The repository does not include that optional runner.
- **Resolution:** Used the available in-app Chromium browser controls to execute
  the same teacher/aide navigation, accessibility-tree, route-guard, and console
  checks against localhost.
- **Prevention:** Record both the preferred runner and the accepted equivalent
  browser fallback in release evidence; do not silently skip browser checks.
- **Status:** Resolved for this smoke test; the manual zoom/keyboard/screen-reader
  matrix remains open.

## 2026-09-03 — Neon account policy rejected custom suspend settings

- **Context:** Creating the disposable fresh-install/cross-classroom branch.
- **Symptom:** Branch creation returned HTTP 412 when a five-minute suspend
  timeout was supplied.
- **Root cause:** This Neon account does not permit changing the suspend interval.
- **Resolution:** Retried branch creation with the account defaults; the isolated
  branch and compute became ready normally.
- **Prevention:** Treat compute tuning as optional during short-lived release
  rehearsals and retry with project defaults when account policy rejects it.
- **Status:** Resolved.

## 2026-09-03 — Fresh-schema verification used a stale table name

- **Context:** Counting the tables created by migrations `0000`–`0006`.
- **Symptom:** The first assertion query found 10 expected tables instead of 11.
- **Root cause:** The query looked for `roster_group_members`; the actual migration
  and schema use `roster_group_students`.
- **Resolution:** Listed the public schema, corrected the verifier, and confirmed
  all 11 expected tables.
- **Prevention:** Derive verification identifiers from migration/schema source
  instead of recalling them from memory.
- **Status:** Resolved; no schema defect existed.

## 2026-09-03 — Shared small-text and primary-button colors missed WCAG AA

- **Context:** Final Phase 4 accessibility review at the release gate.
- **Symptom:** Muted text on the page background measured about 3.61:1, and white
  primary-button text on accent 600 measured about 4.49:1.
- **Root cause:** The visual token handoff had not been checked at the app's actual
  11–14px text sizes against the WCAG AA 4.5:1 threshold.
- **Resolution:** Muted text/statuses now use neutral 700 (5.53:1) and primary
  buttons use accent 700 (6.81:1), with two regression tests tied to the CSS.
- **Prevention:** Run token-level contrast checks whenever shared colors or small
  text styles change.
- **Status:** Resolved.

## 2026-09-03 — Contrast regression test assumed the wrong CSS/TypeScript syntax

- **Context:** Adding automated coverage for the accessibility color correction.
- **Symptom:** The first run could not find tokens because it omitted the
  `color-` prefix; the next strict TypeScript run rejected the regular-expression
  dot-all flag under the repository's configured target.
- **Root cause:** The test helper did not mirror the CSS token names and used a
  newer regex flag than the compiler target accepts.
- **Resolution:** The helper now reads `--color-*` tokens and uses a newline-safe
  negated character class without the dot-all flag. All 58 tests and TypeScript pass.
- **Prevention:** Run the new test and strict compiler immediately after adding a
  build-time parser; keep its syntax within the repository target.
- **Status:** Resolved.

## 2026-09-03 — Browser zoom shortcuts were not exposed by the automation surface

- **Context:** Attempting the native 200% zoom acceptance test in the in-app
  Chromium browser.
- **Symptom:** Both macOS and control-key zoom shortcuts left CSS viewport size
  and device pixel ratio unchanged. A stopped localhost server also left one tab
  on a generated error page that could not navigate back under URL policy.
- **Root cause:** The browser-control surface does not expose native zoom, and its
  generated error document is intentionally isolated.
- **Resolution:** Created a fresh tab after restart and tested 1366×768 plus
  683×384 effective CSS pixels. Both had meaningful content, no horizontal
  overflow, no framework overlay, and no console errors.
- **Prevention:** Use a fresh tab after localhost restarts and distinguish
  equivalent reflow evidence from a true browser-zoom/screen-reader session.
- **Status:** Automated reflow resolved; native 200% zoom and real screen-reader
  validation remain open manual checks.

## 2026-09-03 — A role label is not a sufficient permission model

- **Context:** Adding classroom administration for teachers, aides, and admins.
- **Symptom:** The previous `teacher`/`aide` checks could not express a staff
  member who manages goals but not users, or one who reviews reports without
  entering observations.
- **Root cause:** Role names combined job context and authorization in one
  coarse switch.
- **Resolution:** Added six explicit capability fields and an access-enabled
  flag. Role selection now applies an editable preset; shared authorization
  helpers enforce the stored capabilities. Existing teachers are migration-
  backfilled as initial managers so an upgraded classroom cannot be locked out.
- **Prevention:** Add future permissions centrally and test the capability
  directly, including a case where the role label would otherwise allow it.
- **Status:** Resolved on the local/disposable implementation; production
  migration remains unapplied.

## 2026-09-03 — Disabling access must invalidate existing cookies

- **Context:** Testing user access changes through the admin API.
- **Symptom:** Filtering only the login picker would prevent a new sign-in but
  would leave a previously issued 12-hour signed cookie usable.
- **Root cause:** A signed identity cookie proves who selected the account; it
  does not prove the account is still enabled.
- **Resolution:** Every `getCurrentStaff` lookup now requires both a non-retired
  row and `access_enabled = true`. The integration test disables a user and
  verifies both new login rejection and null `/api/auth/me` for the old cookie.
- **Prevention:** Treat account status as request-time authorization state, not
  as a login-page filter.
- **Status:** Resolved.

## 2026-09-03 — Color explanations need a focus path, not hover alone

- **Context:** Implementing configurable comments over classroom colors.
- **Symptom:** A pointer-only tooltip would be unavailable to Chromebook
  keyboard users, touch users, and screen-reader users, and color alone would
  not convey meaning.
- **Root cause:** “Hover comments” describes one interaction, not the complete
  accessible requirement.
- **Resolution:** Each swatch retains a visible text name, a programmatic label,
  and a described tooltip that appears on both hover and `:focus-within`.
  Keyboard browser verification confirmed visible focus and identical text.
- **Prevention:** For every hover disclosure, define the keyboard, touch, and
  non-visual equivalent during component design.
- **Status:** Resolved; real screen-reader testing remains a manual gate.
