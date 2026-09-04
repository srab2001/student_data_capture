import { describe, expect, it, vi } from "vitest";

const { requestStructuredJson } = vi.hoisted(() => ({ requestStructuredJson: vi.fn() }));
vi.mock("@/lib/ai/client", () => ({ requestStructuredJson }));

import { continueAccommodationChat, InvalidAiSuggestionError } from "@/lib/ai/accommodation-chat";

const context = {
  domain: "accommodation" as const,
  existingAccommodations: [
    { name: "Extended time", setting: "Tests", effectivenessRatings: [3, 4] },
  ],
};

const messages = [{ role: "user" as const, content: "Struggles with reading fluency." }];

describe("continueAccommodationChat", () => {
  it("returns a validated clarifying question", async () => {
    requestStructuredJson.mockResolvedValueOnce({
      kind: "question",
      question: "Has anything already been tried for this?",
    });

    const turn = await continueAccommodationChat(context, messages);
    expect(turn).toEqual({
      kind: "question",
      question: "Has anything already been tried for this?",
    });
  });

  it("returns a validated suggestion", async () => {
    requestStructuredJson.mockResolvedValueOnce({
      kind: "suggestion",
      name: "Text-to-speech",
      setting: "Reading assessments",
      implementationNotes: "Provide audio playback of assessment text on request.",
      rationale: "Addresses fluency without changing what is assessed.",
    });

    const turn = await continueAccommodationChat(context, messages);
    expect(turn.kind).toBe("suggestion");
  });

  it("rejects a response missing required suggestion fields", async () => {
    requestStructuredJson.mockResolvedValueOnce({
      kind: "suggestion",
      name: "Text-to-speech",
    });

    await expect(continueAccommodationChat(context, messages)).rejects.toBeInstanceOf(
      InvalidAiSuggestionError
    );
  });

  it("rejects a response with an unrecognized kind", async () => {
    requestStructuredJson.mockResolvedValueOnce({ kind: "chit-chat", text: "hello" });

    await expect(continueAccommodationChat(context, messages)).rejects.toBeInstanceOf(
      InvalidAiSuggestionError
    );
  });

  it("never sends narrative notes or student identity, only structured signals", async () => {
    requestStructuredJson.mockResolvedValueOnce({
      kind: "question",
      question: "Has anything already been tried for this?",
    });

    const contaminated = {
      domain: "accommodation",
      existingAccommodations: [
        {
          name: "Extended time",
          setting: "Tests",
          effectivenessRatings: [3],
          // A caller might accidentally pass a whole accommodation row in.
          implementationNotes: "Real narrative detail.",
        },
      ],
    } as unknown as Parameters<typeof continueAccommodationChat>[0];

    await continueAccommodationChat(contaminated, messages);

    const sentSystem = requestStructuredJson.mock.calls[0][0].system as string;
    expect(sentSystem).not.toContain("Real narrative detail.");
  });
});
