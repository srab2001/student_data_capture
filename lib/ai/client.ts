import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Anthropic client (docs/compliance.md "AI-assisted
 * features"). Never import this module from a "use client" component —
 * ANTHROPIC_API_KEY must never reach the browser bundle. Every caller goes
 * through requestStructuredJson below rather than the raw SDK, so the
 * "structured output, re-validated before use" rule is enforced in one
 * place instead of per feature.
 */

let client: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.local.example to .env.local and add a key."
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

/** Overridable for local testing; defaults to the current Sonnet model. */
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/**
 * Raised whenever the API call itself fails (network, timeout, auth) or
 * the model declines to call the required tool. Routes should catch this
 * and return a clean "AI unavailable, continue manually" response rather
 * than a 500 — see STRATEGY-ai-goal-accommodation-assistant.md Phase A1/A3.
 */
export class AiUnavailableError extends Error {}

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Ask the model to respond by calling exactly one tool, and return that
 * tool call's already-parsed `input` object. Forcing tool use (rather than
 * asking for free text and parsing it) is what makes the response
 * structured — callers must still re-validate the shape against their own
 * Zod schema before trusting it, since a model can still fill a schema's
 * fields with the wrong values even when the shape is right.
 */
export async function requestStructuredJson({
  system,
  messages,
  toolName,
  toolDescription,
  inputSchema,
  maxTokens = 1024,
}: {
  system: string;
  messages: ChatTurn[];
  toolName: string;
  toolDescription: string;
  inputSchema: Anthropic.Tool.InputSchema;
  maxTokens?: number;
}): Promise<unknown> {
  const anthropic = getAnthropicClient();

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      tools: [{ name: toolName, description: toolDescription, input_schema: inputSchema }],
      tool_choice: { type: "tool", name: toolName },
    });
  } catch (err) {
    throw new AiUnavailableError(
      err instanceof Error ? `AI request failed: ${err.message}` : "AI request failed."
    );
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new AiUnavailableError("The AI did not return a structured suggestion.");
  }
  return toolUse.input;
}
