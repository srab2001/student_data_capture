import { aimValueOnDate, isQuantitativeMetric, numericValueForReading } from "@/lib/progress-monitoring";
import { ICON_SETS } from "@/lib/icon-sets";
import type { ClientGoalSummary } from "./types";

const CATEGORY_ORDER: Record<string, string[]> = {
  prompt_level: ["full_physical", "partial_physical", "gestural", "verbal", "independent"],
  accommodation_used: ["not_used", "used"],
};

function readable(value: string): string {
  const iconMatch = value.match(/^(\d)_of_(\d)$/);
  if (iconMatch) return `${iconMatch[1]} of ${iconMatch[2]}`;
  return value.replaceAll("_", " ");
}

function CategoricalDistribution({ summary }: { summary: ClientGoalSummary }) {
  const counts = new Map<string, number>();
  for (const point of summary.dataPoints) {
    if (point.valueEnum) counts.set(point.valueEnum, (counts.get(point.valueEnum) ?? 0) + 1);
  }
  if (counts.size === 0) {
    return <p className="text-muted py-6 text-center text-sm">No categorical readings in this range.</p>;
  }
  const preferred = summary.goal.metricType === "icon_scale"
    ? ICON_SETS[summary.goal.iconSet ?? "smiley_5"].map((option) => option.value)
    : (CATEGORY_ORDER[summary.goal.metricType] ?? []);
  const categories = [
    ...preferred,
    ...[...counts.keys()].filter((value) => !preferred.includes(value)).sort(),
  ];
  const maximum = Math.max(1, ...counts.values());

  return (
    <figure aria-labelledby={`chart-title-${summary.goal.id}`}>
      <figcaption id={`chart-title-${summary.goal.id}`} className="text-muted mb-2 text-xs">
        Reading distribution. Each bar reports its exact count.
      </figcaption>
      <div role="list" className="flex flex-col gap-2">
        {categories.map((category) => {
          const count = counts.get(category) ?? 0;
          return (
            <div role="listitem" key={category} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="truncate capitalize">{readable(category)}</span>
              <span className="h-4 overflow-hidden rounded-sm" style={{ background: "var(--color-neutral-200)" }}>
                <span
                  className="block h-full"
                  style={{
                    width: count === 0 ? "0%" : `${Math.max(4, (count / maximum) * 100)}%`,
                    background: "var(--color-accent-600)",
                  }}
                />
              </span>
              <span className="font-mono">{count}</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function PromptTemporalChart({ summary }: { summary: ClientGoalSummary }) {
  const hierarchy = summary.goal.promptHierarchy?.length
    ? summary.goal.promptHierarchy
    : CATEGORY_ORDER.prompt_level;
  const points = summary.dataPoints
    .filter((point) => point.valueEnum && hierarchy.includes(point.valueEnum))
    .map((point) => ({
      date: point.sessionDate,
      value: point.valueEnum!,
      position: hierarchy.indexOf(point.valueEnum!) + 1,
    }));
  if (points.length === 0) {
    return <p className="text-muted py-6 text-center text-sm">No prompt readings in this range.</p>;
  }
  if (points.length === 1) {
    return (
      <figure aria-labelledby={`chart-title-${summary.goal.id}`}>
        <figcaption id={`chart-title-${summary.goal.id}`} className="text-muted mb-2 text-xs">
          One dated prompt reading is available; at least two are needed to compare support over time.
        </figcaption>
        <p className="text-sm">
          <span className="font-mono">{points[0].date}</span> · {readable(points[0].value)} · position {points[0].position}/{hierarchy.length}
        </p>
      </figure>
    );
  }
  const midpoint = Math.max(1, Math.floor(points.length / 2));
  const average = (items: typeof points) =>
    items.reduce((sum, item) => sum + item.position, 0) / items.length;
  const early = average(points.slice(0, midpoint));
  const recent = average(points.slice(midpoint));
  return (
    <figure aria-labelledby={`chart-title-${summary.goal.id}`}>
      <figcaption id={`chart-title-${summary.goal.id}`} className="text-muted mb-2 text-xs">
        Prompt support over time. Position follows this goal&apos;s configured hierarchy; it is not an automatic mastery decision.
      </figcaption>
      <p className="mb-2 text-sm">
        Early average position {early.toFixed(1)} of {hierarchy.length} · recent {recent.toFixed(1)} · n={points.length}
      </p>
      <ol className="flex flex-col gap-1 text-xs">
        {points.slice(-8).map((point, index) => (
          <li key={`${point.date}-${index}`} className="grid grid-cols-[6.5rem_1fr] gap-2">
            <span className="font-mono">{point.date}</span>
            <span>{readable(point.value)} · position {point.position}/{hierarchy.length}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function TaskAnalysisProgress({ summary }: { summary: ClientGoalSummary }) {
  const steps = summary.goal.taskAnalysisSteps ?? [];
  const readings = summary.dataPoints
    .map((point) => point.valueNumeric)
    .filter((value): value is number => value !== null);
  if (steps.length === 0 || readings.length === 0) {
    return <p className="text-muted py-6 text-center text-sm">No task-analysis readings in this range.</p>;
  }
  return (
    <figure aria-labelledby={`chart-title-${summary.goal.id}`}>
      <figcaption id={`chart-title-${summary.goal.id}`} className="text-muted mb-2 text-xs">
        Sessions reaching each task-analysis step. Percentages include an exact sample count and do not determine mastery.
      </figcaption>
      <div role="list" className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const reached = readings.filter((value) => value >= index + 1).length;
          const pct = Math.round((reached / readings.length) * 100);
          return (
            <div role="listitem" key={`${index}-${step}`} className="grid grid-cols-[minmax(8rem,1fr)_5rem] gap-2 text-xs">
              <span>{index + 1}. {step}</span>
              <span className="font-mono">{pct}% ({reached}/{readings.length})</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function AbcObservationSummary({ summary }: { summary: ClientGoalSummary }) {
  const observations = summary.dataPoints.filter(
    (point) => point.observationDetails?.kind === "abc"
  );
  return (
    <div role="status" className="rounded-lg p-3 text-sm" style={{ background: "var(--color-neutral-100)" }}>
      {observations.length === 0
        ? "No ABC observations in this range."
        : `${observations.length} structured ABC observation${observations.length === 1 ? "" : "s"} in this range.`}
    </div>
  );
}

function QuantitativeChart({
  summary,
  rangeFrom,
  rangeTo,
}: {
  summary: ClientGoalSummary;
  rangeFrom: string;
  rangeTo: string;
}) {
  const values = summary.dataPoints.flatMap((point) => {
    const value = numericValueForReading(summary.goal.metricType, point);
    return value === null ? [] : [{ date: point.sessionDate, value }];
  });
  const frequencyUnits = summary.goal.metricType === "frequency_count"
    ? new Set(
        summary.dataPoints.map((point) =>
          point.observationDurationSeconds
            ? "occurrences per minute"
            : point.opportunitiesObserved
              ? "occurrences per 100 opportunities"
              : "raw occurrences"
        )
      )
    : new Set<string>();
  const unitLabel = frequencyUnits.size === 1 ? [...frequencyUnits][0] : null;
  const target = summary.goal.progressTarget;
  const dates = [
    rangeFrom,
    rangeTo,
    ...values.map((point) => point.date),
    ...summary.interventions.map((annotation) => annotation.interventionDate),
  ].sort();

  if (values.length === 0 && !target) {
    return <p className="text-muted py-6 text-center text-sm">No numeric readings in this range.</p>;
  }

  const firstDate = dates[0];
  const lastDate = dates.at(-1)!;
  const startMs = new Date(`${firstDate}T12:00:00Z`).getTime();
  const endMs = new Date(`${lastDate}T12:00:00Z`).getTime();
  const duration = Math.max(1, endMs - startMs);
  const aimValues = target
    ? [aimValueOnDate(target, firstDate), aimValueOnDate(target, lastDate)]
    : [];
  const allValues = [...values.map((point) => point.value), ...aimValues];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const padding = Math.max(1, (rawMax - rawMin) * 0.1);
  const minValue = summary.goal.metricType === "accuracy_pct" ? 0 : Math.max(0, rawMin - padding);
  const maxValue = summary.goal.metricType === "accuracy_pct" ? 100 : rawMax + padding;
  const span = Math.max(1, maxValue - minValue);
  const x = (date: string) => 42 + ((new Date(`${date}T12:00:00Z`).getTime() - startMs) / duration) * 436;
  const y = (value: number) => 18 + ((maxValue - value) / span) * 132;
  const pointPath = values.map((point) => `${x(point.date)},${y(point.value)}`).join(" ");

  const description = `${values.length} numeric readings from ${firstDate} through ${lastDate}. ${
    target ? "A dashed aim line is shown." : "No aim line is configured."
  } ${summary.interventions.length} intervention annotations are marked.${
    unitLabel ? ` Frequency values are ${unitLabel}.` : ""
  }`;

  return (
    <figure aria-labelledby={`chart-title-${summary.goal.id}`}>
      <svg
        viewBox="0 0 500 190"
        role="img"
        aria-labelledby={`chart-title-${summary.goal.id} chart-desc-${summary.goal.id}`}
        className="w-full"
      >
        <title id={`chart-title-${summary.goal.id}`}>Progress readings over time</title>
        <desc id={`chart-desc-${summary.goal.id}`}>{description}</desc>
        <line x1="42" y1="150" x2="478" y2="150" stroke="currentColor" opacity="0.35" />
        <line x1="42" y1="18" x2="42" y2="150" stroke="currentColor" opacity="0.35" />
        <text x="38" y="24" textAnchor="end" fontSize="10" fill="currentColor">{Math.round(maxValue * 10) / 10}</text>
        <text x="38" y="153" textAnchor="end" fontSize="10" fill="currentColor">{Math.round(minValue * 10) / 10}</text>
        <text x="42" y="169" fontSize="10" fill="currentColor">{firstDate}</text>
        <text x="478" y="169" textAnchor="end" fontSize="10" fill="currentColor">{lastDate}</text>

        {summary.interventions.map((annotation, index) => (
          <g key={annotation.id}>
            <line
              x1={x(annotation.interventionDate)}
              y1="18"
              x2={x(annotation.interventionDate)}
              y2="150"
              stroke="var(--color-accent-700)"
              strokeDasharray="2 4"
            />
            <text x={x(annotation.interventionDate) + 3} y={29 + (index % 3) * 11} fontSize="9" fill="currentColor">
              I{index + 1}
            </text>
          </g>
        ))}

        {target && (
          <line
            x1={x(firstDate)}
            y1={y(aimValueOnDate(target, firstDate))}
            x2={x(lastDate)}
            y2={y(aimValueOnDate(target, lastDate))}
            stroke="var(--color-accent-2-700)"
            strokeWidth="2"
            strokeDasharray="7 5"
          />
        )}
        {values.length > 1 && (
          <polyline fill="none" stroke="var(--color-accent-700)" strokeWidth="3" points={pointPath} />
        )}
        {values.map((point, index) => (
          <circle
            key={`${point.date}-${index}`}
            cx={x(point.date)}
            cy={y(point.value)}
            r="4"
            fill="var(--color-bg)"
            stroke="var(--color-accent-700)"
            strokeWidth="3"
          >
            <title>{`${point.date}: ${point.value}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-xs">
        <span><span aria-hidden="true">●</span> Recorded value</span>
        {unitLabel ? <span>Unit: {unitLabel}</span> : null}
        {frequencyUnits.size > 1 ? <span>Mixed exposure units—review individual readings</span> : null}
        {target && <span><span aria-hidden="true">┄</span> Aim line</span>}
        {summary.interventions.length > 0 && <span><span aria-hidden="true">┊</span> Intervention</span>}
      </figcaption>
    </figure>
  );
}

export function ProgressChart({
  summary,
  rangeFrom,
  rangeTo,
}: {
  summary: ClientGoalSummary;
  rangeFrom: string;
  rangeTo: string;
}) {
  if (summary.goal.metricType === "abc_observation") {
    return <AbcObservationSummary summary={summary} />;
  }
  if (summary.goal.metricType === "prompt_level") {
    return <PromptTemporalChart summary={summary} />;
  }
  if (summary.goal.metricType === "task_analysis_step") {
    return <TaskAnalysisProgress summary={summary} />;
  }
  return isQuantitativeMetric(summary.goal.metricType) ? (
    <QuantitativeChart summary={summary} rangeFrom={rangeFrom} rangeTo={rangeTo} />
  ) : (
    <CategoricalDistribution summary={summary} />
  );
}
