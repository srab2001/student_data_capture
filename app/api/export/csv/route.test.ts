import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/auth/session", () => ({ getCurrentStaff: async () => ({ id: "staff", classroomId: "classroom", canViewReports: true }) }));
vi.mock("@/lib/auth/authz", () => ({ requireStaff: (s: unknown) => s, assertPermission: () => {} }));
vi.mock("@/lib/audit", () => ({ recordAudit: async () => {} }));
vi.mock("@/lib/summary", () => ({ getProgressSummary: async () => ({
  rangeFrom: "2026-09-01", rangeTo: "2026-09-06", students: [{
    student: { displayName: "Test Student", isSynthetic: true },
    goals: ["academic", "behavioral"].map(domain => ({ goal: { domain, goalText: domain + " goal" }, currentValueLabel: "0", trendLabel: "No trend", collectionEvidence: {label:"1 of 1"}, dataSufficiency:{label:"1 day"}, aimStatus:{label:"No target"}, dataPoints:[], interventions:[] })),
    accommodations: { bySupport: [{ accommodationName: "Test support", setting: "Reading", usedCount: 1, logCount: 1, effectivenessN: 0, fidelityN: 0, contextLinkedCount: 0 }] }
  }]
}) }));
import { GET } from "./route";
describe("CSV report filter", () => {
  it("exports the selected domain and labels the filter", async () => {
    const response = await GET(new NextRequest("http://localhost/api/export/csv?from=2026-09-01&to=2026-09-06&domain=behavioral"));
    expect(response.status).toBe(200);
    const csv = await response.text();
    expect(csv).toContain("behavioral goal");
    expect(csv).not.toContain("academic goal");
    expect(csv).not.toContain("Test support");
    expect(csv).toContain("report_domain_filter");
  });
  it("includes supports when accommodation is selected", async () => {
    const response = await GET(new NextRequest("http://localhost/api/export/csv?from=2026-09-01&to=2026-09-06&domain=accommodation"));
    const csv = await response.text();
    expect(csv).toContain("Test support");
    expect(csv).not.toContain("behavioral goal");
  });
});
