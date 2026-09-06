import type Anthropic from "@anthropic-ai/sdk";
import { requestStructuredJson } from "@/lib/ai/client";
import { buildExplainGoalPayload, type ExplainGoalInput } from "@/lib/ai/redact";
import { explainGoalResponseSchema } from "@/lib/validation";

/**
 * A single-shot, read-only explanation of one goal's measurement setup
 * (STRATEGY-ai-goal-accommodation-assistant.md's bounded-context pattern,
 * applied to a plain "explain this" request). Never writes anything —
 * unlike the goal wizard and accommodation chat, there is nothing here
 * for a teacher to review and save.
 */

const TOOL_NAME = "explain_goal_item";

const INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
      description:
        "A short, plain-language explanation (2-4 sentences) of what this goal measures and how staff record data for it.",
    },
  },
  required: ["explanation"],
};

const SYSTEM_PROMPT = [
  "You explain one IEP goal's measurement setup in plain language for a teacher or aide looking at it on the data-entry or progress-summary screen.",
  "You are given only the goal's domain, its metric type, its goal text, and (if set) its structured measurement plan. No student name or other identifying information is ever provided to you, and none should appear in your response — refer to the student generically (e.g. 'the student') if needed.",
  "Explain what is being measured, how staff record data for this metric type, and what counts as progress or mastery if a measurement plan is given. Keep it to 2-4 short sentences in plain English, with no unexplained jargon.",
  "Always respond by calling the provided tool with your explanation. Never respond with plain text.",
].join("\n");

export class InvalidAiSuggestionError extends Error {}

export async function explainGoalItem(input: ExplainGoalInput): Promise<string> {
  const payload = buildExplainGoalPayload(input);

  const raw = await requestStructuredJson({
    system: `${SYSTEM_PROMPT}\n\nContext: ${JSON.stringify(payload)}`,
    messages: [{ role: "user", content: "Explain this goal." }],
    toolName: TOOL_NAME,
    toolDescription: "Explain what this goal measures and how to record data for it.",
    inputSchema: INPUT_SCHEMA,
    maxTokens: 400,
  });

  const parsed = explainGoalResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new InvalidAiSuggestionError("The AI did not return a valid explanation.");
  }
  return parsed.data.explanation;
}
