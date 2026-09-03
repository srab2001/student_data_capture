# Lessons learned

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
  access; it reported zero vulnerabilities.
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
  deployment evidence.
- **Prevention:** Run the log scan from an approved operator session or CI
  release job and attach the result to the next verification record.
- **Status:** Open operational verification gap.
