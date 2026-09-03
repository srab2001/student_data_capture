import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { getProgressSummary } from "@/lib/summary";
import { PrintButton } from "./PrintButton";
import { schoolDateIso } from "@/lib/observations";
import { summaryFilterSchema } from "@/lib/validation";

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return schoolDateIso(d);
}

export default async function PrintSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; from?: string; to?: string }>;
}) {
  const current = await getCurrentStaff();
  if (!current) redirect("/login");
  if (!current.canViewReports) redirect("/");
  if (!current.classroomId) redirect("/entry");

  const params = await searchParams;
  const filters = summaryFilterSchema.safeParse({
    studentId: params.studentId,
    from: params.from ?? defaultFrom(),
    to: params.to ?? schoolDateIso(),
  });
  if (!filters.success) redirect("/summary");

  const summary = await getProgressSummary(current.classroomId, filters.data);

  const isSynthetic = summary.students.every((s) => s.student.isSynthetic);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-zinc-500">Use your browser&apos;s print dialog to save as PDF.</p>
        <PrintButton />
      </div>

      <div
        className={`mb-4 inline-block rounded-full border px-3 py-1 font-mono text-xs ${
          isSynthetic
            ? "border-red-300 bg-red-50 text-red-800"
            : "border-emerald-300 bg-emerald-50 text-emerald-800"
        }`}
      >
        {isSynthetic ? "SYNTHETIC DATA — prototype only" : "REAL STUDENT DATA"}
      </div>

      <h1 className="text-xl font-semibold text-zinc-950">IEP Progress Summary</h1>
      <p className="text-sm text-zinc-600">
        Reporting period: {summary.rangeFrom} to {summary.rangeTo} · Generated{" "}
        {new Date(summary.generatedAt).toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        For manual transcription into Maryland Online IEP. Not an automated integration —
        see docs/compliance.md.
      </p>

      {summary.students.map((s) => (
        <section key={s.student.id} className="mt-6 break-inside-avoid">
          <h2 className="border-b border-zinc-300 pb-1 text-base font-semibold text-zinc-900">
            {s.student.displayName}
          </h2>

          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-zinc-500">
                <th scope="col" className="py-1 pr-2">
                  Domain
                </th>
                <th scope="col" className="py-1 pr-2">
                  Goal
                </th>
                <th scope="col" className="py-1 pr-2">
                  Current
                </th>
                <th scope="col" className="py-1">
                  Trend
                </th>
                <th scope="col" className="py-1 pl-2">
                  Evidence / aim
                </th>
              </tr>
            </thead>
            <tbody>
              {s.goals.map((g) => (
                <tr key={g.goal.id} className="border-t border-zinc-200">
                  <td className="py-1 pr-2 align-top capitalize">{g.goal.domain}</td>
                  <td className="py-1 pr-2 align-top">{g.goal.goalText}</td>
                  <td className="py-1 pr-2 align-top font-mono">{g.currentValueLabel}</td>
                  <td className="py-1 align-top font-mono">{g.trendLabel}</td>
                  <td className="py-1 pl-2 align-top text-xs">
                    {g.collectionEvidence.label}
                    <span className="block">{g.dataSufficiency.label}</span>
                    <span className="block">{g.aimStatus.label}</span>
                    {g.interventions.map((annotation) => (
                      <span key={annotation.id} className="mt-1 block">
                        Intervention {annotation.interventionDate}: {annotation.description}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {s.goals.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2 text-zinc-400">
                    No goals on file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {s.accommodations.logs.length > 0 && (
            <div className="mt-3 text-xs text-zinc-600">
              <p>
                Accommodation usage: {s.accommodations.usageRatePct ?? "—"}% ·
                Avg. effectiveness: {s.accommodations.avgEffectiveness ?? "—"} / 5.
                Descriptive evidence only; small samples do not establish impact.
              </p>
              <ul className="mt-1 list-disc pl-5">
                {s.accommodations.bySupport.map((support) => (
                  <li key={`${support.accommodationName}:${support.setting ?? ""}`}>
                    {support.accommodationName} ({support.setting ?? "setting not recorded"}): used {support.usedCount}/{support.logCount}; effectiveness {support.avgEffectiveness ?? "—"}/5 (n={support.effectivenessN}); fidelity {support.avgFidelity ?? "—"}/5 (n={support.fidelityN})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
