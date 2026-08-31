import Link from "next/link";
import { ICON_SETS } from "@/lib/icon-sets";

export const metadata = {
  title: "User Guide — IEP Capture Pilot",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-zinc-100 pt-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {children}
      </div>
    </section>
  );
}

const TOC = [
  ["what", "What this tool is"],
  ["signing-in", "Signing in"],
  ["entry-screen", "The roster-sweep entry screen"],
  ["controls", "What each control does"],
  ["managing-goals", "Changing a student's goals"],
  ["accommodations", "Logging accommodations"],
  ["summary", "The progress summary"],
  ["data-privacy", "Data & privacy"],
  ["troubleshooting", "Troubleshooting"],
] as const;

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400">
        User guide
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        How to use the IEP Capture Pilot
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        A quick-tap tool for logging IEP progress during class instead of after it, on a
        Chromebook. You can also click the{" "}
        <span className="rounded-full border border-zinc-200 px-2 py-0.5 font-mono text-xs dark:border-zinc-800">
          ? Take the tour
        </span>{" "}
        button on the entry and summary screens for a guided walkthrough instead of reading.
      </p>

      <nav aria-label="Table of contents" className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
          On this page
        </p>
        <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {TOC.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 space-y-6">
        <Section id="what" title="What this tool is">
          <p>
            A single-classroom prototype for capturing IEP progress data — accuracy/fluency
            trials, behavior tallies, icon-degree ratings, prompt-level/independence tracking,
            and accommodation usage — as fast taps during instruction, instead of typing into a
            spreadsheet afterward.
          </p>
          <p>
            It was built independently by a teacher using Claude Code, and{" "}
            <strong>has not been reviewed by HCPSS IT or the district&apos;s data privacy
            office.</strong> During this prototype phase it only ever contains synthetic (fake)
            data — every screen that shows data is labeled to make that obvious. See{" "}
            <Link href="/" className="underline underline-offset-4">
              the home page
            </Link>{" "}
            for the current build-phase status, and{" "}
            <span className="font-mono text-xs">docs/compliance.md</span> in the repo for the
            full governance review.
          </p>
        </Section>

        <Section id="signing-in" title="Signing in">
          <p>
            Go to <span className="font-mono text-xs">/login</span> and pick your name from the
            list. This picker is a <strong>prototype stand-in</strong> for real sign-in — it will
            be replaced by HCPSS Google Workspace SSO before any real student data is ever used.
          </p>
          <p>
            If the list is empty, the database hasn&apos;t been seeded with synthetic staff yet —
            that&apos;s a setup step for whoever is running this instance, not something you can
            fix from the browser.
          </p>
        </Section>

        <Section id="entry-screen" title="The roster-sweep entry screen">
          <p>
            <span className="font-mono text-xs">/entry</span> shows one row per goal, one way or
            another, for every student in your classroom, each listing only their own IEP goals.
            The design goal is a full sweep of an 8–10 student caseload in under 3 minutes, so
            every control is a single tap — no drill-down, no typing unless you want to add a note.
          </p>
          <p>
            The pill switcher at the top of the screen — <strong>Card stack</strong>,{" "}
            <strong>Grid</strong>, or <strong>Accordion</strong> — changes how dense that view is,
            not what data is behind it:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Card stack</strong> — one full card per student, every goal expanded. The
              most spacious; best for a smaller caseload or a slower-paced sweep.
            </li>
            <li>
              <strong>Grid</strong> — a spreadsheet-style table, one row per goal, flattened across
              the whole roster. Fastest to scan, but drops the note and accommodation controls for
              density — switch to Card stack or Accordion for those.
            </li>
            <li>
              <strong>Accordion</strong> — one collapsed row per student; tap a name to expand
              their goals. Good middle ground for a larger caseload.
            </li>
          </ul>
          <p>
            All three read and write the same underlying data — switching layouts mid-sweep never
            loses or duplicates a tap.
          </p>
          <p>
            <strong>Every tap saves immediately</strong> as its own write to the server. Nothing
            is batched client-side, so closing the Chromebook mid-period doesn&apos;t lose data.
          </p>
        </Section>

        <Section id="controls" title="What each control does">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Accuracy trials (✓ / ✗):</strong> tap once per trial. The running percentage
              next to the buttons updates live. Used for accuracy/fluency goals.
            </li>
            <li>
              <strong>Behavior tally:</strong> one tap per occurrence of a behavior. The number
              shown is this session&apos;s running count.
            </li>
            <li>
              <strong>Icon-degree rating:</strong> tap one icon to record a single reading — it
              does <em>not</em> add to a running count, unlike the tally. Which icon set a goal
              uses is fixed when the goal is set up, not chosen per entry:
              <ul className="mt-2 list-none space-y-1 pl-0">
                {Object.entries(ICON_SETS).map(([key, options]) => (
                  <li key={key} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
                      {key}
                    </span>
                    <span>{options.map((o) => o.glyph).join(" ")}</span>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <strong>Duration / latency timer:</strong> Start when the behavior or task begins,
              Stop when it ends. Restarting adds to the same session&apos;s total rather than
              resetting it.
            </li>
            <li>
              <strong>Prompt-level chips:</strong> one tap sets how much support the student
              needed — Full Physical, Partial Physical, Gestural, Verbal, or Independent.
            </li>
            <li>
              <strong>Task-analysis steps:</strong> tap the step number the student reached in a
              multi-step task.
            </li>
            <li>
              <strong>Notes:</strong> every goal has an optional, collapsed-by-default note field —
              useful for a quick ABC (antecedent-behavior-consequence) observation without
              slowing down the sweep.
            </li>
          </ul>
        </Section>

        <Section id="managing-goals" title="Changing a student's goals">
          <p>
            Click <strong>Manage goals</strong> at the top of a student&apos;s card on{" "}
            <span className="font-mono text-xs">/entry</span> to add a new goal, edit an
            existing one (domain, goal text, which control it uses, target frequency, icon
            set), or retire one. Retiring a goal removes it from the entry screen but keeps
            its past data points — nothing is deleted.
          </p>
          <p>
            Changing a goal&apos;s entry control (its metric type) changes which tap control
            shows up for it going forward on the entry screen — for example switching a goal
            from a plain tally to an icon-degree rating. Past data points logged under the old
            control type are kept as-is.
          </p>
        </Section>

        <Section id="accommodations" title="Logging accommodations">
          <p>
            Under each student&apos;s goals, &quot;+ Log accommodation&quot; opens a small form:
            pick the accommodation, rate its effectiveness with the same star control used for
            icon-degree goals, and log it as used or not used. This is separate from goal data
            points — it tracks accommodation usage at the student level.
          </p>
        </Section>

        <Section id="summary" title="The progress summary">
          <p>
            <span className="font-mono text-xs">/summary</span> is read-mostly — it rolls up
            everything logged on the entry screen into the kind of quantitative snapshot used for
            a PLAAFP update. Filter by date range, IEP domain, or a single student; click any goal
            row to see its trend line and every logged reading with its date.
          </p>
          <p>
            <strong>Export CSV</strong> and <strong>Print view</strong> both produce a
            grouped-by-goal report labeled reporting period and SYNTHETIC/REAL, meant for manual
            transcription into Maryland Online IEP. Neither one writes back to any external
            system automatically — that integration is explicitly out of scope (see
            docs/compliance.md).
          </p>
        </Section>

        <Section id="data-privacy" title="Data & privacy">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              A red <span className="font-mono text-xs">Synthetic data only</span> badge means
              every student on screen is fake — safe to click around freely.
            </li>
            <li>
              Every read and write is audit-logged, and that audit log cannot be deleted by any
              role, including a future admin role — enforced at the database level, not just in
              the app.
            </li>
            <li>
              An aide can create entries but cannot edit or delete another staff member&apos;s
              past entries; a teacher has full access within their own classroom only.
            </li>
            <li>
              Real, identifiable student data is not permitted in this system until HCPSS
              IT/privacy leadership signs off — see the Status table in
              docs/compliance.md.
            </li>
          </ul>
        </Section>

        <Section id="troubleshooting" title="Troubleshooting">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>&quot;Loading staff…&quot; never resolves on /login:</strong> the database
              has no seeded staff yet. Whoever runs this instance needs to run{" "}
              <span className="font-mono text-xs">npm run db:seed</span> from a machine with
              normal network access.
            </li>
            <li>
              <strong>An entry screen action shows an error banner:</strong> it&apos;s usually a
              session issue — try signing out and back in from the header.
            </li>
            <li>
              <strong>You want to see the tour again:</strong> the{" "}
              <span className="font-mono text-xs">? Take the tour</span> button in the bottom-left
              of the entry and summary screens re-opens it any time — it isn&apos;t a one-time
              thing.
            </li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
