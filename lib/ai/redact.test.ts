import { describe, expect, it } from "vitest";
import { buildAccommodationChatContext, buildGoalWizardPayload } from "@/lib/ai/redact";

describe("buildGoalWizardPayload", () => {
  it("keeps only the non-identifying fields it's given", () => {
    const payload = buildGoalWizardPayload({
      domain: "academic",
      metricType: "accuracy_pct",
      skillDescription: "Reading grade-level passages aloud.",
      baselineSummary: "40% accuracy over 3 sessions",
    });
    expect(payload).toEqual({
      domain: "academic",
      metricType: "accuracy_pct",
      skillDescription: "Reading grade-level passages aloud.",
      baselineSummary: "40% accuracy over 3 sessions",
    });
  });

  it("never carries a student name/ID through, even if the caller's object has one", () => {
    const contaminated = {
      domain: "academic",
      metricType: "accuracy_pct",
      skillDescription: "Reading grade-level passages aloud.",
      // A caller might accidentally pass a whole student/goal row in.
      studentId: "11111111-1111-1111-1111-111111111111",
      displayName: "Real Student Name",
      email: "student@example.com",
    } as unknown as Parameters<typeof buildGoalWizardPayload>[0];

    const payload = buildGoalWizardPayload(contaminated);

    expect(payload).not.toHaveProperty("studentId");
    expect(payload).not.toHaveProperty("displayName");
    expect(payload).not.toHaveProperty("email");
    expect(Object.keys(payload).sort()).toEqual(
      ["baselineSummary", "domain", "metricType", "skillDescription"].sort()
    );
  });

  it("defaults a missing baseline summary to null rather than omitting it", () => {
    const payload = buildGoalWizardPayload({
      domain: "behavioral",
      metricType: "frequency_count",
      skillDescription: "Calling out without raising a hand.",
    });
    expect(payload.baselineSummary).toBeNull();
  });
});

describe("buildAccommodationChatContext", () => {
  it("keeps only structured accommodation signals, never narrative notes", () => {
    const payload = buildAccommodationChatContext({
      domain: "accommodation",
      existingAccommodations: [
        { name: "Text-to-speech", setting: "Reading assessments", effectivenessRatings: [4, 5] },
      ],
    });
    expect(payload).toEqual({
      domain: "accommodation",
      existingAccommodations: [
        { name: "Text-to-speech", setting: "Reading assessments", effectivenessRatings: [4, 5] },
      ],
    });
  });

  it("never carries a student name/ID through, even if the caller's object has one", () => {
    const contaminated = {
      domain: "accommodation",
      existingAccommodations: [
        {
          name: "Extended time",
          setting: "Tests",
          effectivenessRatings: [3],
          // A caller might accidentally pass a whole accommodation row in,
          // including its narrative implementation notes.
          studentId: "11111111-1111-1111-1111-111111111111",
          implementationNotes: "Real narrative detail that could name the student.",
        },
      ],
    } as unknown as Parameters<typeof buildAccommodationChatContext>[0];

    const payload = buildAccommodationChatContext(contaminated);

    expect(payload).not.toHaveProperty("studentId");
    expect(payload.existingAccommodations[0]).not.toHaveProperty("studentId");
    expect(payload.existingAccommodations[0]).not.toHaveProperty("implementationNotes");
    expect(Object.keys(payload.existingAccommodations[0]).sort()).toEqual(
      ["effectivenessRatings", "name", "setting"].sort()
    );
  });

  it("copies the ratings array rather than aliasing the caller's array", () => {
    const ratings = [4, 5];
    const payload = buildAccommodationChatContext({
      domain: "accommodation",
      existingAccommodations: [{ name: "Extended time", setting: "Tests", effectivenessRatings: ratings }],
    });
    ratings.push(1);
    expect(payload.existingAccommodations[0].effectivenessRatings).toEqual([4, 5]);
  });
});
