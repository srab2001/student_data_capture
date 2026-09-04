import type Anthropic from "@anthropic-ai/sdk";
import { requestStructuredJson, type ChatTurn } from "@/lib/ai/client";
import { buildAccommodationChatContext, type AccommodationChatInput } from "@/lib/ai/redact";
import {
  accommodationChatQuestionSchema,
  accommodationChatSuggestionSchema,
} from "@/lib/validation";
import { z } from "zod";

/**
 * A bounded (not open-ended) Q&A that ends in one concrete suggested
 * accommodation (STRATEGY-ai-goal-accommodation-assistant.md Phase A3).
 * This never writes to the database — the caller (the accommodation-chat
 * route) returns the suggestion for the teacher to review and save
 * through the existing POST /api/student-accommodations, exactly like a
 * manually entered accommodation.
 */

const TOOL_NAME = "respond_in_accommodation_chat";

const INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: ["question", "suggestion"],
      description:
        "'question' to ask the teacher one more clarifying question, or 'suggestion' once you have enough information to propose a concrete accommodation.",
    },
    question: {
      type: "string",
      description: "A single clarifying question. Required when kind is 'question'.",
    },
    name: {
      type: "string",
      description: "The accommodation's name, e.g. 'Text-to-speech'. Required when kind is 'suggestion'.",
    },
    setting: {
      type: "string",
      description: "Where/when the accommodation applies. Required when kind is 'suggestion'.",
    },
    implementationNotes: {
      type: "string",
      description: "Concrete directions for how staff provide the support. Required when kind is 'suggestion'.",
    },
    rationale: {
      type: "string",
      description: "A short explanation of why this accommodation fits, referencing only the given context. Required when kind is 'suggestion'.",
    },
  },
  required: ["kind"],
};

const SYSTEM_PROMPT = [
  "You help a teacher choose an evidence-based accommodation for a student.",
  "You are given only: the relevant goal domain, and the student's existing accommodations with their setting and past staff effectiveness ratings (1-5, higher is more effective). No student name or other identifying information is ever provided to you, and none should appear in your response — refer to the student generically (e.g. 'the student') if you need to.",
  "Ask at most 2-3 short clarifying questions, one at a time, about the specific difficulty the student is having and what has or hasn't worked — do not ask for or expect anything that would identify the student. As soon as you have enough information, stop asking and propose one concrete, evidence-based accommodation.",
  "Always respond by calling the provided tool: kind 'question' with a single question, or kind 'suggestion' with name, setting, implementationNotes, and a short rationale. Never respond with plain text.",
].join("\n");

export type AccommodationChatTurn =
  | z.infer<typeof accommodationChatQuestionSchema>
  | z.infer<typeof accommodationChatSuggestionSchema>;

export class InvalidAiSuggestionError extends Error {}

function toValidatedTurn(raw: unknown): AccommodationChatTurn {
  if (typeof raw !== "object" || raw === null || !("kind" in raw)) {
    throw new InvalidAiSuggestionError("The AI response was not a valid chat turn.");
  }
  const candidate = raw as Record<string, unknown>;

  if (candidate.kind === "question") {
    const parsed = accommodationChatQuestionSchema.safeParse({
      kind: "question",
      question: candidate.question,
    });
    if (!parsed.success) {
      throw new InvalidAiSuggestionError("The AI's question was not valid.");
    }
    return parsed.data;
  }

  if (candidate.kind === "suggestion") {
    const parsed = accommodationChatSuggestionSchema.safeParse({
      kind: "suggestion",
      name: candidate.name,
      setting: candidate.setting,
      implementationNotes: candidate.implementationNotes,
      rationale: candidate.rationale,
    });
    if (!parsed.success) {
      throw new InvalidAiSuggestionError("The AI's suggestion was not complete or valid.");
    }
    return parsed.data;
  }

  throw new InvalidAiSuggestionError("The AI response was not a valid chat turn.");
}

export async function continueAccommodationChat(
  context: AccommodationChatInput,
  messages: ChatTurn[]
): Promise<AccommodationChatTurn> {
  const payload = buildAccommodationChatContext(context);

  const raw = await requestStructuredJson({
    system: `${SYSTEM_PROMPT}\n\nContext: ${JSON.stringify(payload)}`,
    messages,
    toolName: TOOL_NAME,
    toolDescription: "Ask one clarifying question, or propose one accommodation.",
    inputSchema: INPUT_SCHEMA,
    maxTokens: 512,
  });

  return toValidatedTurn(raw);
}
