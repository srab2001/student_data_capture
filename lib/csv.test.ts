import { describe, expect, it } from "vitest";
import { csvEscape } from "@/lib/csv";

describe("csvEscape", () => {
  it("quotes commas, quotes, and line breaks", () => {
    expect(csvEscape('Visual cue, then "wait"\nrepeat')).toBe(
      '"Visual cue, then ""wait""\nrepeat"'
    );
  });

  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1:A2)", "\tformula", "\rformula"])(
    "neutralizes spreadsheet formula prefix %j",
    (value) => {
      expect(csvEscape(value)).toBe(`'${value}`);
    }
  );

  it("does not alter ordinary values", () => {
    expect(csvEscape("Began visual checklist")).toBe("Began visual checklist");
  });
});
