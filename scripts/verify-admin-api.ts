/**
 * Destructive-to-fixture admin API verification. Run only against a local
 * server backed by a disposable, synthetic database branch.
 *
 *   ADMIN_DISPOSABLE_TEST=yes BASE_URL=http://127.0.0.1:3101 \
 *     npx tsx scripts/verify-admin-api.ts
 */

import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3101";
if (process.env.ADMIN_DISPOSABLE_TEST !== "yes") {
  throw new Error("Refusing to run without ADMIN_DISPOSABLE_TEST=yes.");
}
if (!['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname)) {
  throw new Error("Refusing to run against a non-local application URL.");
}

type ApiResult<T> = { status: number; body: T; headers: Headers };

async function request<T>(path: string, init: RequestInit = {}, cookie?: string) {
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
  return { status: response.status, body: body as T, headers: response.headers } satisfies ApiResult<T>;
}

async function login(staffId: string) {
  const response = await request<{ ok: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ staffId }),
  });
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  return { status: response.status, cookie };
}

const allPermissions = {
  canManageUsers: true,
  canManageStudents: true,
  canManageGoals: true,
  canManageColors: true,
  canRecordData: true,
  canViewReports: true,
};

const measurementPlan = {
  baseline: "Synthetic baseline for disposable admin verification.",
  observableDefinition: "Synthetic learner selects the matching response within ten seconds.",
  measurementMethod: "Present five synthetic opportunities and record each response.",
  masteryCriterion: "Four of five synthetic opportunities across three probes.",
  collectionDays: ["wednesday"],
  observationsRequired: 1,
  setting: "Synthetic small-group instruction",
  opportunitiesRequired: 5,
  observationWindowMinutes: null,
  responsibleRole: "either",
  effectiveFrom: "2026-09-01",
  effectiveTo: null,
};

async function main() {
  const publicStaff = await request<{
    staff: Array<{ id: string; name: string; role: string }>;
  }>("/api/auth/staff");
  assert.equal(publicStaff.status, 200);
  const teacher = publicStaff.body.staff.find((user) => user.name === "Synthetic Teacher");
  const aide = publicStaff.body.staff.find((user) => user.name === "Synthetic Aide");
  const isolationTeacher = publicStaff.body.staff.find(
    (user) => user.name === "Synthetic Isolation Teacher"
  );
  assert.ok(teacher && aide && isolationTeacher);

  const teacherLogin = await login(teacher.id);
  const aideLogin = await login(aide.id);
  const isolationLogin = await login(isolationTeacher.id);
  assert.equal(teacherLogin.status, 200);
  assert.equal(aideLogin.status, 200);
  assert.equal(isolationLogin.status, 200);
  assert.ok(teacherLogin.cookie && aideLogin.cookie && isolationLogin.cookie);

  assert.equal((await request("/api/admin/users", {}, teacherLogin.cookie)).status, 200);
  assert.equal((await request("/api/admin/users", {}, aideLogin.cookie)).status, 403);

  const suffix = crypto.randomUUID();
  const createdUserResponse = await request<{ user: { id: string } }>(
    "/api/admin/users",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Synthetic Admin Verification ${suffix.slice(0, 8)}`,
        email: `admin-${suffix}@example.invalid`,
        role: "admin",
        accessEnabled: true,
        permissions: allPermissions,
      }),
    },
    teacherLogin.cookie
  );
  assert.equal(createdUserResponse.status, 201);
  const adminId = createdUserResponse.body.user.id;
  const adminLogin = await login(adminId);
  assert.equal(adminLogin.status, 200);
  assert.ok(adminLogin.cookie);

  const selfLockout = await request(
    `/api/admin/users/${adminId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ permissions: { ...allPermissions, canManageUsers: false } }),
    },
    adminLogin.cookie
  );
  assert.equal(selfLockout.status, 409);

  const userManagerOnly = {
    canManageUsers: true,
    canManageStudents: false,
    canManageGoals: false,
    canManageColors: false,
    canRecordData: false,
    canViewReports: false,
  };
  assert.equal(
    (
      await request(
        `/api/admin/users/${adminId}`,
        { method: "PATCH", body: JSON.stringify({ permissions: userManagerOnly }) },
        teacherLogin.cookie
      )
    ).status,
    200
  );
  assert.equal((await request("/api/students", {}, adminLogin.cookie)).status, 403);
  assert.equal(
    (
      await request(
        `/api/admin/users/${adminId}`,
        { method: "PATCH", body: JSON.stringify({ permissions: allPermissions }) },
        teacherLogin.cookie
      )
    ).status,
    200
  );

  const disableResponse = await request(
    `/api/admin/users/${adminId}`,
    { method: "PATCH", body: JSON.stringify({ accessEnabled: false }) },
    teacherLogin.cookie
  );
  assert.equal(disableResponse.status, 200);
  assert.equal((await login(adminId)).status, 404);
  const disabledSession = await request<{ staff: unknown }>(
    "/api/auth/me",
    {},
    adminLogin.cookie
  );
  assert.equal(disabledSession.status, 200);
  assert.equal(disabledSession.body.staff, null);

  const reactivateResponse = await request(
    `/api/admin/users/${adminId}`,
    { method: "PATCH", body: JSON.stringify({ accessEnabled: true }) },
    teacherLogin.cookie
  );
  assert.equal(reactivateResponse.status, 200);
  const reactivatedLogin = await login(adminId);
  assert.equal(reactivatedLogin.status, 200);
  assert.ok(reactivatedLogin.cookie);

  const denyGoalsResponse = await request(
    `/api/admin/users/${adminId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ permissions: { ...allPermissions, canManageGoals: false } }),
    },
    teacherLogin.cookie
  );
  assert.equal(denyGoalsResponse.status, 200);
  const deniedGoal = await request(
    "/api/goals",
    {
      method: "POST",
      body: JSON.stringify({
        studentId: "00000000-0000-4000-8000-000000000000",
        domain: "academic",
        goalText: "Permission denial fixture",
        metricType: "accuracy_pct",
        targetFrequency: "weekly",
        measurementPlan,
      }),
    },
    reactivatedLogin.cookie
  );
  assert.equal(deniedGoal.status, 403);

  await request(
    `/api/admin/users/${adminId}`,
    { method: "PATCH", body: JSON.stringify({ permissions: allPermissions }) },
    teacherLogin.cookie
  );

  const studentResponse = await request<{ student: { id: string } }>(
    "/api/students",
    {
      method: "POST",
      body: JSON.stringify({ displayName: `Synthetic Admin Student ${suffix.slice(0, 8)}` }),
    },
    reactivatedLogin.cookie
  );
  assert.equal(studentResponse.status, 201);

  const goalResponse = await request<{ goal: { id: string; goalText: string } }>(
    "/api/goals",
    {
      method: "POST",
      body: JSON.stringify({
        studentId: studentResponse.body.student.id,
        domain: "academic",
        goalText: "Match synthetic vocabulary pictures",
        metricType: "accuracy_pct",
        targetFrequency: "weekly",
        measurementPlan,
      }),
    },
    reactivatedLogin.cookie
  );
  assert.equal(goalResponse.status, 201);
  const goalId = goalResponse.body.goal.id;
  const editGoal = await request<{ goal: { goalText: string } }>(
    `/api/goals/${goalId}`,
    { method: "PATCH", body: JSON.stringify({ goalText: "Match five synthetic vocabulary pictures" }) },
    reactivatedLogin.cookie
  );
  assert.equal(editGoal.status, 200);
  assert.equal(editGoal.body.goal.goalText, "Match five synthetic vocabulary pictures");

  const colorResponse = await request<{ color: { id: string; hoverComment: string } }>(
    "/api/color-settings",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Synthetic Ready ${suffix.slice(0, 8)}`,
        hexValue: "#2563EB",
        hoverComment: "Synthetic learner is ready for the next prompt.",
        sortOrder: 99,
      }),
    },
    reactivatedLogin.cookie
  );
  assert.equal(colorResponse.status, 201);
  const colorId = colorResponse.body.color.id;
  const aideColors = await request<{ colors: Array<{ id: string }> }>(
    "/api/color-settings",
    {},
    aideLogin.cookie
  );
  assert.equal(aideColors.status, 200);
  assert.ok(aideColors.body.colors.some((color) => color.id === colorId));
  assert.equal(
    (
      await request(
        `/api/color-settings/${colorId}`,
        { method: "PATCH", body: JSON.stringify({ hexValue: "#7C3AED" }) },
        isolationLogin.cookie
      )
    ).status,
    404
  );
  assert.equal(
    (
      await request(
        "/api/color-settings",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Aide denial",
            hexValue: "#111827",
            hoverComment: "Must not be created.",
            sortOrder: 1,
          }),
        },
        aideLogin.cookie
      )
    ).status,
    403
  );
  assert.equal(
    (
      await request(
        `/api/admin/users/${isolationTeacher.id}`,
        { method: "PATCH", body: JSON.stringify({ accessEnabled: false }) },
        teacherLogin.cookie
      )
    ).status,
    404
  );

  assert.equal((await request(`/api/goals/${goalId}`, { method: "DELETE" }, reactivatedLogin.cookie)).status, 200);
  assert.equal((await request(`/api/color-settings/${colorId}`, { method: "DELETE" }, reactivatedLogin.cookie)).status, 200);
  assert.equal((await request(`/api/admin/users/${adminId}`, { method: "DELETE" }, teacherLogin.cookie)).status, 200);
  assert.equal((await login(adminId)).status, 404);

  console.log(
    JSON.stringify({
      adminApi: "passed",
      disabledSessionRevoked: true,
      permissionDenials: 5,
      crossClassroomDenials: 2,
      userLifecycle: "create-disable-reactivate-retire",
      colorLifecycle: "create-read-retire",
      goalLifecycle: "create-edit-retire",
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
