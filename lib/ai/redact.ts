import type { goalDomainValues, metricTypeValues } from "@/lib/validation";

/**
 * Builds the only payloads this app is allowed to send to Anthropic
 * (docs/compliance.md "AI-assisted features", data-minimization).
 *
 * Every function here takes the field it needs by name and returns a
 * brand-new object containing only those fields — it never spreads or
 * forwards its input. That makes the "no student name/ID leaves the
 * server" guarantee true by construction: even if a caller passes in a
 * whole Student/Goal row by mistake, only the fields explicitly listed
 * below make it into the returned object. assertNoIdentifyingKeys is a
 * second, defensive check on top of that, not the primary guarantee.
 */

const FORBIDDEN_KEYS = new Set([
  "id",
  "studentid",
  "displayname",
  "studentname",
  "email",
  "createdbystaffid",
  "enteredbystaffid",
  "actorstaffid",
  "classroomid",
]);

function assertNoIdentifyingKeys(payload: object, label: string): void {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`Redacted AI payload (${label}) must not include "${key}".`);
    }
  }
}

export type GoalWizardInput = {
  domain: (typeof goalDomainValues)[number];
  metricType: (typeof metricTypeValues)[number];
  skillDescription: string;
  baselineSummary?: string | null;
};

export type GoalWizardPayload = {
  domain: (typeof goalDomainValues)[number];
  metricType: (typeof metricTypeValues)[number];
  skillDescription: string;
  baselineSummary: string | null;
};

/** No student name/ID, roster, or narrative note is ever part of this. */
export function buildGoalWizardPayload(input: GoalWizardInput): GoalWizardPayload {
  const payload: GoalWizardPayload = {
    domain: input.domain,
    metricType: input.metricType,
    skillDescription: input.skillDescription,
    baselineSummary: input.baselineSummary ?? null,
  };
  assertNoIdentifyingKeys(payload, "goal-wizard");
  return payload;
}

export type ExistingAccommodationSignal = {
  name: string;
  setting: string | null;
  effectivenessRatings: number[];
};

export type AccommodationChatInput = {
  domain: (typeof goalDomainValues)[number];
  existingAccommodations: ExistingAccommodationSignal[];
};

export type AccommodationChatPayload = {
  domain: (typeof goalDomainValues)[number];
  existingAccommodations: ExistingAccommodationSignal[];
};

/**
 * Sends only structured signals (name/setting/effectiveness ratings), not
 * a student's name/ID or narrative implementationNotes/reasonNotUsed text
 * — those free-text fields are the ones most likely to carry identifying
 * or otherwise sensitive detail (docs/compliance.md, §2.5 of the strategy
 * doc).
 */
export function buildAccommodationChatContext(
  input: AccommodationChatInput
): AccommodationChatPayload {
  const existingAccommodations = input.existingAccommodations.map((item) => {
    const entry: ExistingAccommodationSignal = {
      name: item.name,
      setting: item.setting,
      effectivenessRatings: [...item.effectivenessRatings],
    };
    assertNoIdentifyingKeys(entry, "accommodation-chat:existingAccommodations[]");
    return entry;
  });

  const payload: AccommodationChatPayload = {
    domain: input.domain,
    existingAccommodations,
  };
  assertNoIdentifyingKeys(payload, "accommodation-chat");
  return payload;
}
