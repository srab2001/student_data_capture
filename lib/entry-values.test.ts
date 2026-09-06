import { describe, expect, it } from "vitest";
import { parseFluencyInput } from "./entry-values";
import { summaryFilterSchema } from "./validation";

describe("observation entry", () => {
  it("leaves blank or invalid readings unrecorded", () => {
    for (const raw of ["", "   ", "abc", "Infinity", "-1"]) expect(parseFluencyInput(raw)).toBeNull();
  });
  it("preserves an explicit zero and a measured reading", () => {
    expect(parseFluencyInput("0")).toBe(0);
    expect(parseFluencyInput("42")).toBe(42);
  });
});
describe("report domain validation", () => {
  const dates = { from: "2026-09-01", to: "2026-09-06" };
  it("retains the chosen domain and defaults to all", () => {
    expect(summaryFilterSchema.parse({ ...dates, domain: "behavioral" }).domain).toBe("behavioral");
    expect(summaryFilterSchema.parse(dates).domain).toBe("all");
  });
  it("rejects unknown domains", () => {
    expect(summaryFilterSchema.safeParse({ ...dates, domain: "unknown" }).success).toBe(false);
  });
});
