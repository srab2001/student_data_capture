import type Anthropic from "@anthropic-ai/sdk";
import { requestStructuredJson } from "@/lib/ai/client";
import { buildGoalWizardPayload, type GoalWizardInput } from "@/lib/ai/redact";
import { collectionDayValues, type MeasurementPlan } from "@/lib/measurement-plans";
import { measurementPlanSchema } from "@/lib/validation";

/**
 * Turns a teacher's short, non-identifying description into a *proposed*
 * MeasurementPlan (STRATEGY-ai-goal-accommodation-assistant.md Phase A1).
 * This never writes to the database — the caller (the goal-wizard route)
 * returns the proposal for the teacher to review and save through the
 * existing POST /api/goals, exactly like a manually authored plan.
 */

const TOOL_NAME = "propose_measurement_plan";

const INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    baseline: {
      type: "string",
      description: "A short factual baseline statement, e.g. '2 of 10 independent opportunities'.",
    },
    observableDefinition: {
      type: "string",
      description: "What counts and what does not count as an instance of the target skill/behavior.",
    },
    measurementMethod: {
      type: "string",
      description: "The concrete procedure staff will follow to collect each observation.",
    },
    masteryCriterion: {
      type: "string",
      description: "The specific, measurable criterion that defines mastery.",
    },
    collectionDays: {
      type: "array",
      items: { type: "string", enum: [...collectionDayValues] },
      description: "Weekdays data collection is scheduled.",
    },
    observationsRequired: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "Minimum observations required on each scheduled day.",
    },
    setting: {
      type: "string",
      description: "Where/during what activity data is collected.",
    },
    opportunitiesRequired: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description:
        "Opportunities per observation, for trial-based metrics. Omit entirely if using observationWindowMinutes instead.",
    },
    observationWindowMinutes: {
      type: "integer",
      minimum: 1,
      maximum: 480,
      description:
        "Observation window length in minutes, for time-based/behavioral metrics. Omit entirely if using opportunitiesRequired instead.",
    },
    responsibleRole: {
      type: "string",
      enum: ["teacher", "aide", "either"],
      description: "Who is responsible for collecting this data.",
    },
    effectiveFrom: {
      type: "string",
      description: "ISO date (YYYY-MM-DD) the plan starts, usually today.",
    },
    effectiveTo: {
      type: "string",
      description: "ISO date (YYYY-MM-DD) the plan ends, if a review date is appropriate. Omit if open-ended.",
    },
  },
  required: [
    "baseline",
    "observableDefinition",
    "measurementMethod",
    "masteryCriterion",
    "collectionDays",
    "observationsRequired",
    "setting",
    "responsibleRole",
    "effectiveFrom",
  ],
};

function systemPrompt(todayIso: string): string {
  return [
    "You help a special-education teacher draft a structured IEP progress-monitoring measurement plan for one goal.",
    "You are given only: the goal's domain, the metric type staff will use to record data, a short skill/behavior description, and optionally a summarized baseline. No student name or other identifying information is ever provided to you, and none should appear in your response.",
    `Today's date is ${todayIso}. Set effectiveFrom to today unless the description implies otherwise, and leave effectiveTo unset unless a specific review date makes sense.`,
    "Set exactly one of opportunitiesRequired or observationWindowMinutes — pick opportunities for trial-based metrics (e.g. accuracy, fluency, rubric, task-analysis, prompt-level, icon-scale, accommodation-used) and an observation window for time-based or behavioral metrics (e.g. frequency, duration, latency, ABC observation) — and omit the other field entirely.",
    "Keep every field concise, observable, and practical for a classroom teacher or aide to follow. Call the provided tool with your proposal — do not respond with plain text.",
  ].join("\n");
}

function normalizeCandidate(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const candidate = raw as Record<string, unknown>;
  return {
    ...candidate,
    opportunitiesRequired: candidate.opportunitiesRequired ?? null,
    observationWindowMinutes: candidate.observationWindowMinutes ?? null,
    effectiveTo: candidate.effectiveTo ?? null,
  };
}

export class InvalidAiSuggestionError extends Error {}

export async function proposeMeasurementPlan(
  input: GoalWizardInput,
  { now = new Date() }: { now?: Date } = {}
): Promise<MeasurementPlan> {
  const payload = buildGoalWizardPayload(input);
  const todayIso = now.toISOString().slice(0, 10);

  const raw = await requestStructuredJson({
    system: systemPrompt(todayIso),
    messages: [{ role: "user", content: JSON.stringify(payload) }],
    toolName: TOOL_NAME,
    toolDescription: "Propose a structured IEP goal measurement plan.",
    inputSchema: INPUT_SCHEMA,
  });

  const parsed = measurementPlanSchema.safeParse(normalizeCandidate(raw));
  if (!parsed.success) {
    throw new InvalidAiSuggestionError(
      "The AI suggestion wasn't a complete, valid measurement plan."
    );
  }
  return parsed.data;
}
