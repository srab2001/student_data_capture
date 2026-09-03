/**
 * Destructive-to-fixture Phase 4 API verification. Run only against a local
 * server whose DATABASE_URL points to a disposable, synthetic Neon branch:
 *
 *   PHASE4_DISPOSABLE_TEST=yes BASE_URL=http://127.0.0.1:3100 \
 *     npx tsx scripts/verify-phase4-api.ts
 */

import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
if (process.env.PHASE4_DISPOSABLE_TEST !== "yes") {
  throw new Error("Refusing to run without PHASE4_DISPOSABLE_TEST=yes.");
}
const parsedBaseUrl = new URL(baseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname)) {
  throw new Error("Refusing to run against a non-local application URL.");
}

type ApiResult<T> = { status: number; body: T; headers: Headers };

type GoalFixture = {
  id: string;
  studentId: string;
  metricType: string;
  progressTarget: { targetValue: number } | null;
  supersedesGoalId: string | null;
};

type SummaryFixture = {
  students: Array<{
    student: { id: string; isSynthetic: boolean };
    goals: Array<{
      goal: { id: string };
      dataPoints: unknown[];
      interventions: unknown[];
      aimStatus: { kind: string };
      collectionEvidence: { compliancePct: number };
    }>;
  }>;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  cookie?: string
): Promise<ApiResult<T>> {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { status: response.status, body: body as T, headers: response.headers };
}

async function login(staffId: string): Promise<string> {
  const response = await request<{ ok: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ staffId }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "login must set a session cookie");
  return cookie;
}

function fluencyTarget(targetValue = 60) {
  return {
    baselineValue: 20,
    baselineDate: "2026-01-01",
    targetValue,
    targetDate: "2027-01-01",
    direction: "increase",
  };
}

function observationFor(metricType: string, goalId: string, sessionId: string) {
  const common = {
    goalId,
    sessionId,
    clientRequestId: crypto.randomUUID(),
    entryAt: "2026-09-02T15:00:00.000Z",
  };
  switch (metricType) {
    case "accuracy_pct":
      return { ...common, entryKind: "correct_trial" };
    case "fluency_rate":
      return { ...common, entryKind: "numeric", valueNumeric: 48 };
    case "frequency_count":
      return { ...common, entryKind: "tally", valueNumeric: 1 };
    case "duration_seconds":
      return { ...common, entryKind: "duration", valueNumeric: 120 };
    case "task_analysis_step":
      return { ...common, entryKind: "task_step", valueNumeric: 2 };
    default:
      throw new Error(`No quantitative fixture for ${metricType}.`);
  }
}

async function main() {
  const staffResponse = await request<{
    staff: Array<{ id: string; name: string; role: "teacher" | "aide" | "admin" }>;
  }>("/api/auth/staff");
  assert.equal(staffResponse.status, 200);
  const teacher = staffResponse.body.staff.find(
    (member) => member.name === "Synthetic Teacher"
  );
  const aide = staffResponse.body.staff.find(
    (member) => member.name === "Synthetic Aide"
  );
  const isolationTeacher = staffResponse.body.staff.find(
    (member) => member.name === "Synthetic Isolation Teacher"
  );
  assert.equal(teacher?.name, "Synthetic Teacher");
  assert.equal(aide?.name, "Synthetic Aide");
  assert.equal(isolationTeacher?.role, "teacher");
  const teacherCookie = await login(teacher!.id);
  const aideCookie = await login(aide!.id);
  const isolationTeacherCookie = await login(isolationTeacher!.id);

  const initialSummary = await request<SummaryFixture>(
    "/api/summary?from=2026-01-01&to=2026-12-31",
    {},
    teacherCookie
  );
  assert.equal(initialSummary.status, 200);
  assert.ok(initialSummary.body.students.every((student) => student.student.isSynthetic));
  const student = initialSummary.body.students[0].student;
  const createGoalResponse = await request<{ goal: GoalFixture }>(
    "/api/goals",
    {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        domain: "academic",
        goalText: "Synthetic Phase 4 oral-reading probe",
        metricType: "fluency_rate",
        targetFrequency: "weekly",
        measurementPlan: {
          baseline: "Synthetic 20 correct responses per minute",
          observableDefinition: "Synthetic correct oral-reading responses during a one-minute probe.",
          measurementMethod: "Administer one synthetic one-minute probe and enter the correct response count.",
          masteryCriterion: "Synthetic criterion for disposable verification only.",
          collectionDays: ["wednesday"],
          observationsRequired: 1,
          setting: "Synthetic small-group reading",
          opportunitiesRequired: 1,
          observationWindowMinutes: null,
          responsibleRole: "either",
          effectiveFrom: "2026-01-01",
          effectiveTo: "2027-01-01",
        },
        progressTarget: fluencyTarget(),
      }),
    },
    teacherCookie
  );
  assert.equal(createGoalResponse.status, 201);
  const observedGoal = createGoalResponse.body.goal;

  const sessionResponse = await request<{ session: { id: string } }>(
    "/api/sessions",
    {
      method: "POST",
      body: JSON.stringify({
        sessionDate: "2026-09-02",
        periodLabel: "Phase 4 disposable verification",
      }),
    },
    teacherCookie
  );
  assert.ok([200, 201].includes(sessionResponse.status));

  const observationBody = observationFor(
    observedGoal.metricType,
    observedGoal.id,
    sessionResponse.body.session.id
  );
  const observationResponse = await request<{ dataPoint: { id: string } }>(
    "/api/data-points",
    { method: "POST", body: JSON.stringify(observationBody) },
    teacherCookie
  );
  assert.equal(observationResponse.status, 201);
  const retryResponse = await request<{ dataPoint: { id: string } }>(
    "/api/data-points",
    { method: "POST", body: JSON.stringify(observationBody) },
    teacherCookie
  );
  assert.equal(retryResponse.status, 200);
  assert.equal(retryResponse.body.dataPoint.id, observationResponse.body.dataPoint.id);

  const description = "Synthetic Phase 4 marker — began visual checklist.";
  const interventionResponse = await request<{ intervention: { id: string } }>(
    "/api/interventions",
    {
      method: "POST",
      body: JSON.stringify({
        goalId: observedGoal.id,
        interventionDate: "2026-09-02",
        description,
      }),
    },
    teacherCookie
  );
  assert.equal(interventionResponse.status, 201);
  const intervention = interventionResponse.body.intervention;

  const targetResponse = await request<{
    replacedGoalId: string;
    goal: GoalFixture;
  }>(
    `/api/goals/${observedGoal.id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ progressTarget: fluencyTarget(65) }),
    },
    teacherCookie
  );
  assert.equal(targetResponse.status, 200);
  assert.equal(targetResponse.body.replacedGoalId, observedGoal.id);
  assert.equal(targetResponse.body.goal.supersedesGoalId, observedGoal.id);
  assert.ok(targetResponse.body.goal.progressTarget);
  assert.equal(targetResponse.body.goal.progressTarget.targetValue, 65);
  const activeGoal = targetResponse.body.goal;

  const isolationStudentResponse = await request<{
    student: { id: string };
  }>(
    "/api/students",
    {
      method: "POST",
      body: JSON.stringify({ displayName: "Synthetic Isolation Student" }),
    },
    isolationTeacherCookie
  );
  assert.equal(isolationStudentResponse.status, 201);
  const isolationGoalResponse = await request<{ goal: GoalFixture }>(
    "/api/goals",
    {
      method: "POST",
      body: JSON.stringify({
        studentId: isolationStudentResponse.body.student.id,
        domain: "academic",
        goalText: "Synthetic cross-classroom isolation probe",
        metricType: "fluency_rate",
        targetFrequency: "weekly",
        measurementPlan: {
          baseline: "Synthetic isolation baseline",
          observableDefinition: "Synthetic cross-classroom oral-reading response.",
          measurementMethod: "Administer one synthetic one-minute probe.",
          masteryCriterion: "Synthetic isolation criterion.",
          collectionDays: ["wednesday"],
          observationsRequired: 1,
          setting: "Synthetic isolation classroom",
          opportunitiesRequired: 1,
          observationWindowMinutes: null,
          responsibleRole: "teacher",
          effectiveFrom: "2026-01-01",
          effectiveTo: "2027-01-01",
        },
        progressTarget: fluencyTarget(),
      }),
    },
    isolationTeacherCookie
  );
  assert.equal(isolationGoalResponse.status, 201);
  const isolationGoal = isolationGoalResponse.body.goal;
  const isolationInterventionResponse = await request<{
    intervention: { id: string };
  }>(
    "/api/interventions",
    {
      method: "POST",
      body: JSON.stringify({
        goalId: isolationGoal.id,
        interventionDate: "2026-09-02",
        description: "Synthetic cross-classroom marker.",
      }),
    },
    isolationTeacherCookie
  );
  assert.equal(isolationInterventionResponse.status, 201);

  const crossClassroomGoalRead = await request<unknown>(
    `/api/goals/${isolationGoal.id}`,
    {},
    teacherCookie
  );
  assert.equal(crossClassroomGoalRead.status, 404);
  const crossClassroomGoalUpdate = await request<unknown>(
    `/api/goals/${isolationGoal.id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ progressTarget: fluencyTarget(70) }),
    },
    teacherCookie
  );
  assert.equal(crossClassroomGoalUpdate.status, 404);
  const crossClassroomInterventionCreate = await request<unknown>(
    "/api/interventions",
    {
      method: "POST",
      body: JSON.stringify({
        goalId: isolationGoal.id,
        interventionDate: "2026-09-02",
        description,
      }),
    },
    teacherCookie
  );
  assert.equal(crossClassroomInterventionCreate.status, 404);
  const crossClassroomInterventionRead = await request<{
    interventions: unknown[];
  }>(`/api/interventions?goalId=${isolationGoal.id}`, {}, teacherCookie);
  assert.equal(crossClassroomInterventionRead.status, 200);
  assert.equal(crossClassroomInterventionRead.body.interventions.length, 0);
  const crossClassroomInterventionDelete = await request<unknown>(
    `/api/interventions/${isolationInterventionResponse.body.intervention.id}`,
    { method: "DELETE" },
    teacherCookie
  );
  assert.equal(crossClassroomInterventionDelete.status, 404);
  const crossClassroomGroupCreate = await request<unknown>(
    "/api/roster-groups",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Synthetic forbidden mixed-classroom group",
        studentIds: [student.id, isolationStudentResponse.body.student.id],
      }),
    },
    teacherCookie
  );
  assert.equal(crossClassroomGroupCreate.status, 403);

  const unknownGoalResponse = await request<unknown>(
    "/api/interventions",
    {
      method: "POST",
      body: JSON.stringify({
        goalId: crypto.randomUUID(),
        interventionDate: "2026-09-02",
        description,
      }),
    },
    teacherCookie
  );
  assert.equal(unknownGoalResponse.status, 404);

  const updatedSummary = await request<SummaryFixture>(
    `/api/summary?studentId=${observedGoal.studentId}&from=2026-09-02&to=2026-09-02`,
    {},
    teacherCookie
  );
  assert.equal(updatedSummary.status, 200);
  const observedGoalSummary = updatedSummary.body.students[0].goals.find(
    (summary) => summary.goal.id === observedGoal.id
  );
  assert.ok(observedGoalSummary, "observed goal must be present in the summary");
  assert.equal(observedGoalSummary.dataPoints.length, 1);
  assert.equal(observedGoalSummary.interventions.length, 1);
  assert.notEqual(observedGoalSummary.aimStatus.kind, "not_configured");
  assert.notEqual(observedGoalSummary.aimStatus.kind, "no_data");
  assert.equal(observedGoalSummary.collectionEvidence.compliancePct, 100);

  const csvResponse = await request<string>(
    `/api/export/csv?studentId=${observedGoal.studentId}&from=2026-09-02&to=2026-09-02`,
    {},
    teacherCookie
  );
  assert.equal(csvResponse.status, 200);
  assert.match(csvResponse.body, /collection_compliance/);
  assert.match(csvResponse.body, /evidence_depth/);
  assert.match(csvResponse.body, /aim_status/);
  assert.match(csvResponse.body, /Synthetic Phase 4 marker/);

  const printResponse = await request<string>(
    `/summary/print?studentId=${observedGoal.studentId}&from=2026-09-02&to=2026-09-02`,
    {},
    teacherCookie
  );
  assert.equal(printResponse.status, 200);
  assert.match(printResponse.body, /Evidence \/ aim/);
  assert.match(printResponse.body, /Synthetic Phase 4 marker/);

  const invalidDate = await request<unknown>(
    "/api/summary?from=not-a-date&to=2026-12-31",
    {},
    teacherCookie
  );
  assert.equal(invalidDate.status, 400);
  const oversizedRange = await request<unknown>(
    "/api/summary?from=2024-01-01&to=2026-12-31",
    {},
    teacherCookie
  );
  assert.equal(oversizedRange.status, 400);

  const aideRead = await request<{ interventions: unknown[] }>(
    `/api/interventions?goalId=${observedGoal.id}`,
    {},
    aideCookie
  );
  assert.equal(aideRead.status, 200);
  assert.equal(aideRead.body.interventions.length, 1);
  const aideCreate = await request<unknown>(
    "/api/interventions",
    {
      method: "POST",
      body: JSON.stringify({
        goalId: activeGoal.id,
        interventionDate: "2026-09-03",
        description,
      }),
    },
    aideCookie
  );
  assert.equal(aideCreate.status, 403);
  const aideDelete = await request<unknown>(
    `/api/interventions/${intervention.id}`,
    { method: "DELETE" },
    aideCookie
  );
  assert.equal(aideDelete.status, 403);
  const aideStudentCreate = await request<unknown>(
    "/api/students",
    { method: "POST", body: JSON.stringify({ displayName: "Synthetic Blocked Student" }) },
    aideCookie
  );
  assert.equal(aideStudentCreate.status, 403);
  const aideGoalCreate = await request<unknown>(
    "/api/goals",
    { method: "POST", body: JSON.stringify({}) },
    aideCookie
  );
  assert.equal(aideGoalCreate.status, 403);
  const aideGoalUpdate = await request<unknown>(
    `/api/goals/${activeGoal.id}`,
    { method: "PATCH", body: JSON.stringify({}) },
    aideCookie
  );
  assert.equal(aideGoalUpdate.status, 403);

  const teacherDelete = await request<unknown>(
    `/api/interventions/${intervention.id}`,
    { method: "DELETE" },
    teacherCookie
  );
  assert.equal(teacherDelete.status, 200);
  const afterDelete = await request<{ interventions: unknown[] }>(
    `/api/interventions?goalId=${observedGoal.id}`,
    {},
    teacherCookie
  );
  assert.equal(afterDelete.status, 200);
  assert.equal(afterDelete.body.interventions.length, 0);

  console.log(
    JSON.stringify({
      syntheticStudents: initialSummary.body.students.length,
      versionedGoal: true,
      idempotentObservationRetry: true,
      summaryDecisionSupport: true,
      csvAndPrint: true,
      teacherInterventionLifecycle: true,
      aideRead: true,
      aideMutationDenials: 5,
      invalidSummaryFilterDenials: 2,
      unknownGoalDenial: true,
      crossClassroomDenials: 6,
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
