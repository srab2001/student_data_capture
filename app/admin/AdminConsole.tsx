"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { CurrentStaff } from "@/lib/auth/session";
import type { ClassroomColor, Staff, Student } from "@/lib/db/types";
import {
  ROLE_PERMISSION_PRESETS,
  STAFF_PERMISSION_KEYS,
  type StaffPermissions,
} from "@/lib/staff-permissions";
import { staffRoleValues } from "@/lib/validation";
import { ColorMeaning } from "@/components/ClassroomColorGuide";
import { auditTableLabel } from "@/lib/admin-audit";
import { DataReadinessAdmin } from "./DataReadinessAdmin";

const PERMISSION_LABEL: Record<keyof StaffPermissions, string> = {
  canManageUsers: "Manage users and access",
  canManageStudents: "Add students and manage roster groups",
  canManageGoals: "Add, edit, and retire goals and interventions",
  canManageColors: "Manage classroom colors and explanations",
  canRecordData: "Record and correct observations",
  canViewReports: "View summaries and exports",
};

type UserDraft = {
  name: string;
  email: string;
  role: CurrentStaff["role"];
  accessEnabled: boolean;
  permissions: StaffPermissions;
};

function permissionsFromUser(user: Staff): StaffPermissions {
  return {
    canManageUsers: user.canManageUsers,
    canManageStudents: user.canManageStudents,
    canManageGoals: user.canManageGoals,
    canManageColors: user.canManageColors,
    canRecordData: user.canRecordData,
    canViewReports: user.canViewReports,
  };
}

function PermissionFields({
  value,
  onChange,
  disabled,
}: {
  value: StaffPermissions;
  onChange: (next: StaffPermissions) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Permissions</legend>
      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {STAFF_PERMISSION_KEYS.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              checked={value[key]}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, [key]: event.target.checked })}
            />
            {PERMISSION_LABEL[key]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function UserEditor({
  user,
  currentUserId,
  onChanged,
  onRetired,
}: {
  user: Staff;
  currentUserId: string;
  onChanged: (user: Staff) => void;
  onRetired: (id: string) => void;
}) {
  const [draft, setDraft] = useState<UserDraft>({
    name: user.name,
    email: user.email,
    role: user.role,
    accessEnabled: user.accessEnabled,
    permissions: permissionsFromUser(user),
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ user: Staff }>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      onChanged(response.user);
      setMessage("User saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save user.");
    } finally {
      setPending(false);
    }
  }

  async function retire() {
    if (!confirm(`Retire ${user.name}? Their sign-in access will end immediately.`)) return;
    setPending(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      onRetired(user.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to retire user.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="card">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-muted flex flex-col text-xs">
          Name
          <input
            className="input mt-1"
            value={draft.name}
            disabled={pending}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            required
          />
        </label>
        <label className="text-muted flex flex-col text-xs">
          Email
          <input
            className="input mt-1"
            type="email"
            value={draft.email}
            disabled={pending}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            required
          />
        </label>
        <label className="text-muted flex flex-col text-xs">
          Role preset
          <select
            className="input mt-1"
            value={draft.role}
            disabled={pending}
            onChange={(event) => {
              const role = event.target.value as CurrentStaff["role"];
              setDraft({ ...draft, role, permissions: ROLE_PERMISSION_PRESETS[role] });
            }}
          >
            {staffRoleValues.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ minHeight: 44 }}>
          <input
            type="checkbox"
            checked={draft.accessEnabled}
            disabled={pending || user.id === currentUserId}
            onChange={(event) => setDraft({ ...draft, accessEnabled: event.target.checked })}
          />
          Sign-in access enabled
        </label>
      </div>
      <div className="mt-3">
        <PermissionFields
          value={draft.permissions}
          disabled={pending}
          onChange={(permissions) => setDraft({ ...draft, permissions })}
        />
      </div>
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
      <div className="mt-3 flex justify-between gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ color: "#b91c1c" }}
          disabled={pending || user.id === currentUserId}
          onClick={retire}
        >
          Retire user
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save user"}
        </button>
      </div>
    </form>
  );
}

function NewUserForm({ onCreated }: { onCreated: (user: Staff) => void }) {
  const [draft, setDraft] = useState<UserDraft>({
    name: "",
    email: "",
    role: "aide",
    accessEnabled: true,
    permissions: ROLE_PERMISSION_PRESETS.aide,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ user: Staff }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      onCreated(response.user);
      setDraft({
        name: "",
        email: "",
        role: "aide",
        accessEnabled: true,
        permissions: ROLE_PERMISSION_PRESETS.aide,
      });
      setMessage("User added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add user.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={create} className="card" style={{ borderStyle: "dashed" }}>
      <h3>Add user</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-muted flex flex-col text-xs">
          Name
          <input className="input mt-1" value={draft.name} disabled={pending} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
        </label>
        <label className="text-muted flex flex-col text-xs">
          Email
          <input className="input mt-1" type="email" value={draft.email} disabled={pending} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required />
        </label>
        <label className="text-muted flex flex-col text-xs">
          Role preset
          <select
            className="input mt-1"
            value={draft.role}
            disabled={pending}
            onChange={(event) => {
              const role = event.target.value as CurrentStaff["role"];
              setDraft({ ...draft, role, permissions: ROLE_PERMISSION_PRESETS[role] });
            }}
          >
            {staffRoleValues.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ minHeight: 44 }}>
          <input type="checkbox" checked={draft.accessEnabled} disabled={pending} onChange={(event) => setDraft({ ...draft, accessEnabled: event.target.checked })} />
          Sign-in access enabled
        </label>
      </div>
      <div className="mt-3">
        <PermissionFields value={draft.permissions} disabled={pending} onChange={(permissions) => setDraft({ ...draft, permissions })} />
      </div>
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
      <div className="mt-3 flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add user"}</button>
      </div>
    </form>
  );
}

function StudentEditor({
  student,
  canManageStudents,
  canManageGoals,
  onChanged,
  onRetired,
}: {
  student: Student;
  canManageStudents: boolean;
  canManageGoals: boolean;
  onChanged: (student: Student) => void;
  onRetired: (id: string) => void;
}) {
  const [displayName, setDisplayName] = useState(student.displayName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ student: Student }>(`/api/students/${student.id}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName }),
      });
      setDisplayName(response.student.displayName);
      onChanged(response.student);
      setMessage("Student name saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save student.");
    } finally {
      setPending(false);
    }
  }

  async function retire() {
    if (!confirm(`Retire ${student.displayName}? Their goals and observations will be preserved as historical records.`)) return;
    setPending(true);
    setMessage(null);
    try {
      await apiFetch(`/api/students/${student.id}`, { method: "DELETE" });
      onRetired(student.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to retire student.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="card">
      <label className="text-muted flex flex-col text-xs">
        Student display name
        <input
          className="input mt-1"
          value={displayName}
          disabled={pending || !canManageStudents}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          maxLength={200}
        />
      </label>
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {canManageStudents ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "#b91c1c" }}
            disabled={pending}
            onClick={retire}
          >
            Retire student
          </button>
        ) : <span />}
        <div className="flex flex-wrap gap-2">
          {canManageGoals && (
            <Link href={`/goals/${student.id}`} className="btn btn-secondary">
              Configure data plan
            </Link>
          )}
          {canManageStudents && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || !displayName.trim() || displayName.trim() === student.displayName}
            >
              {pending ? "Saving…" : "Save name"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function StudentAdmin({
  canAddStudents,
  canManageGoals,
}: {
  canAddStudents: boolean;
  canManageGoals: boolean;
}) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ students: Student[] }>("/api/students")
      .then((response) => setStudents(response.students))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load students."));
  }, []);

  async function addStudent(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ student: Student }>("/api/students", {
        method: "POST",
        body: JSON.stringify({ displayName }),
      });
      setStudents((current) => [...(current ?? []), response.student]);
      setDisplayName("");
      setMessage("Student added. Add goals from the student list below.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add student.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="students" className="mt-10" aria-labelledby="students-heading">
      <h2 id="students-heading">Students and goals</h2>
      <p className="text-muted mt-1 text-sm">Add a student, then configure a complete measurement plan for each new goal.</p>
      {canAddStudents && (
        <form onSubmit={addStudent} className="card mt-4 flex flex-wrap items-end gap-3" style={{ borderStyle: "dashed" }}>
          <label className="text-muted flex min-w-64 flex-1 flex-col text-xs">
            Student display name
            <input className="input mt-1" value={displayName} disabled={pending} onChange={(event) => setDisplayName(event.target.value)} required maxLength={200} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={pending || !displayName.trim()}>{pending ? "Adding…" : "Add student"}</button>
        </form>
      )}
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {students?.map((student) => (
          <StudentEditor
            key={student.id}
            student={student}
            canManageStudents={canAddStudents}
            canManageGoals={canManageGoals}
            onChanged={(updated) => setStudents((current) =>
              (current ?? []).map((item) => item.id === updated.id ? updated : item)
            )}
            onRetired={(id) => setStudents((current) =>
              (current ?? []).filter((item) => item.id !== id)
            )}
          />
        ))}
        {students === null && <p className="text-muted text-sm">Loading students…</p>}
      </div>
    </section>
  );
}

type AdminAuditEntry = {
  id: string;
  actorName: string;
  action: string;
  tableName: string;
  recordId: string | null;
  at: string;
  changedFields: string[];
};

function AuditAdmin() {
  const [entries, setEntries] = useState<AdminAuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);

  const load = useCallback(() => {
    apiFetch<{ entries: AdminAuditEntry[] }>("/api/admin/audit?limit=50")
      .then((response) => {
        setEntries(response.entries);
        setError(null);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unable to load audit history.");
      })
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section id="audit" className="mt-10" aria-labelledby="audit-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="audit-heading">Audit history</h2>
          <p className="text-muted mt-1 text-sm">
            Recent classroom activity shows who changed configuration and when. Sensitive field values are not displayed here.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setRefreshing(true);
            load();
          }}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh history"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm" style={{ color: "#b91c1c" }}>{error}</p>}
      {!entries && !error ? <p className="text-muted mt-3 text-sm">Loading audit history…</p> : null}
      {entries ? (
        <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-neutral-200)" }}>
          <table className="min-w-[46rem] w-full text-left text-sm">
            <caption className="sr-only">The 50 most recent audited actions in this classroom</caption>
            <thead className="text-muted" style={{ background: "var(--color-neutral-100)" }}>
              <tr>
                <th scope="col" className="px-3 py-2">When</th>
                <th scope="col" className="px-3 py-2">Staff member</th>
                <th scope="col" className="px-3 py-2">Action</th>
                <th scope="col" className="px-3 py-2">Area</th>
                <th scope="col" className="px-3 py-2">Changed fields</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t" style={{ borderColor: "var(--color-neutral-200)" }}>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(entry.at).toLocaleString()}</td>
                  <td className="px-3 py-2">{entry.actorName}</td>
                  <td className="px-3 py-2 capitalize">{entry.action.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2">{auditTableLabel(entry.tableName)}</td>
                  <td className="px-3 py-2">{entry.changedFields.length > 0 ? entry.changedFields.join(", ") : "—"}</td>
                </tr>
              ))}
              {entries.length === 0 ? (
                <tr><td colSpan={5} className="text-muted px-3 py-6 text-center">No audited activity yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

type ColorDraft = { name: string; hexValue: string; hoverComment: string; sortOrder: number };

function ColorEditor({ color, onChanged, onRetired }: { color: ClassroomColor; onChanged: (color: ClassroomColor) => void; onRetired: (id: string) => void }) {
  const [draft, setDraft] = useState<ColorDraft>({ name: color.name, hexValue: color.hexValue, hoverComment: color.hoverComment, sortOrder: color.sortOrder });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ color: ClassroomColor }>(`/api/color-settings/${color.id}`, { method: "PATCH", body: JSON.stringify(draft) });
      onChanged(response.color);
      setMessage("Color saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save color.");
    } finally {
      setPending(false);
    }
  }

  async function retire() {
    if (!confirm(`Remove ${color.name} from the color guide?`)) return;
    setPending(true);
    try {
      await apiFetch(`/api/color-settings/${color.id}`, { method: "DELETE" });
      onRetired(color.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove color.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="card">
      <ColorMeaning color={{ ...color, ...draft }} />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-muted flex flex-col text-xs">Name<input className="input mt-1" value={draft.name} disabled={pending} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
        <label className="text-muted flex flex-col text-xs">Color<input className="input mt-1" type="color" value={draft.hexValue} disabled={pending} onChange={(event) => setDraft({ ...draft, hexValue: event.target.value.toUpperCase() })} /></label>
        <label className="text-muted flex flex-col text-xs sm:col-span-2">Hover/focus explanation<textarea className="input mt-1" rows={2} value={draft.hoverComment} disabled={pending} onChange={(event) => setDraft({ ...draft, hoverComment: event.target.value })} required /></label>
        <label className="text-muted flex flex-col text-xs">Display order<input className="input mt-1" type="number" min={0} max={1000} value={draft.sortOrder} disabled={pending} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} /></label>
      </div>
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
      <div className="mt-3 flex justify-between gap-2">
        <button type="button" className="btn btn-ghost" style={{ color: "#b91c1c" }} disabled={pending} onClick={retire}>Remove color</button>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save color"}</button>
      </div>
    </form>
  );
}

function ColorAdmin() {
  const [colors, setColors] = useState<ClassroomColor[] | null>(null);
  const [draft, setDraft] = useState<ColorDraft>({ name: "", hexValue: "#2563EB", hoverComment: "", sortOrder: 0 });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sortColors = useCallback((items: ClassroomColor[]) => [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)), []);

  useEffect(() => {
    apiFetch<{ colors: ClassroomColor[] }>("/api/color-settings")
      .then((response) => setColors(response.colors))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load colors."));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ color: ClassroomColor }>("/api/color-settings", { method: "POST", body: JSON.stringify(draft) });
      setColors((current) => sortColors([...(current ?? []), response.color]));
      setDraft({ name: "", hexValue: "#2563EB", hoverComment: "", sortOrder: (colors?.length ?? 0) + 1 });
      setMessage("Color added to the classroom guide.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add color.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="colors" className="mt-10" aria-labelledby="colors-heading">
      <h2 id="colors-heading">Color guide</h2>
      <p className="text-muted mt-1 text-sm">Colors never stand alone: every swatch keeps a text label and a hover/focus explanation.</p>
      <form onSubmit={create} className="card mt-4" style={{ borderStyle: "dashed" }}>
        <h3>Add color</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-muted flex flex-col text-xs">Name<input className="input mt-1" value={draft.name} disabled={pending} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
          <label className="text-muted flex flex-col text-xs">Color<input className="input mt-1" type="color" value={draft.hexValue} disabled={pending} onChange={(event) => setDraft({ ...draft, hexValue: event.target.value.toUpperCase() })} /></label>
          <label className="text-muted flex flex-col text-xs sm:col-span-2">Hover/focus explanation<textarea className="input mt-1" rows={2} value={draft.hoverComment} disabled={pending} onChange={(event) => setDraft({ ...draft, hoverComment: event.target.value })} required /></label>
          <label className="text-muted flex flex-col text-xs">Display order<input className="input mt-1" type="number" min={0} max={1000} value={draft.sortOrder} disabled={pending} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} /></label>
        </div>
        {message && <p role="status" className="mt-2 text-sm">{message}</p>}
        <div className="mt-3 flex justify-end"><button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add color"}</button></div>
      </form>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {colors?.map((color) => <ColorEditor key={color.id} color={color} onChanged={(updated) => setColors((current) => sortColors((current ?? []).map((item) => item.id === updated.id ? updated : item)))} onRetired={(id) => setColors((current) => (current ?? []).filter((item) => item.id !== id))} />)}
        {colors === null && <p className="text-muted text-sm">Loading colors…</p>}
      </div>
    </section>
  );
}

export function AdminConsole({ current }: { current: CurrentStaff }) {
  const [users, setUsers] = useState<Staff[] | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    if (!current.canManageUsers) return;
    apiFetch<{ users: Staff[] }>("/api/admin/users")
      .then((response) => setUsers(response.users))
      .catch((error) => setUserError(error instanceof Error ? error.message : "Unable to load users."));
  }, [current.canManageUsers]);

  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <p className="card-kicker">Classroom administration</p>
      <h1 className="mt-1">Admin console</h1>
      <p className="text-muted mt-2 text-sm">All settings are limited to your classroom. Changes to users, students, goals, and colors are validated and audit logged.</p>
      <div className="card mt-4">
        <h2 className="text-base">Administrator responsibilities</h2>
        <p className="text-muted mt-1 text-sm">
          Prepare staff access and student data plans, resolve readiness warnings, and review configuration history. Preserve historical evidence and leave mastery and instructional decisions to the IEP team.
        </p>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Admin sections">
        {current.canManageUsers && <a className="btn btn-secondary" href="#users">Users</a>}
        {(current.canManageStudents || current.canManageGoals) && <a className="btn btn-secondary" href="#students">Students & goals</a>}
        {current.canManageGoals && <a className="btn btn-secondary" href="#readiness">Data readiness</a>}
        {current.canManageColors && <a className="btn btn-secondary" href="#colors">Colors</a>}
        {current.canManageUsers && <a className="btn btn-secondary" href="#audit">Audit history</a>}
      </nav>

      {current.canManageUsers && (
        <section id="users" className="mt-10" aria-labelledby="users-heading">
          <h2 id="users-heading">Users, permissions, and access</h2>
          <p className="text-muted mt-1 text-sm">A role applies a starting preset. Individual permissions remain editable. Disabling access ends existing sessions on their next request.</p>
          <div className="mt-4"><NewUserForm onCreated={(user) => setUsers((currentUsers) => [...(currentUsers ?? []), user])} /></div>
          {userError && <p role="alert" className="mt-3 text-sm" style={{ color: "#b91c1c" }}>{userError}</p>}
          <div className="mt-4 flex flex-col gap-3">
            {users?.map((user) => <UserEditor key={user.id} user={user} currentUserId={current.id} onChanged={(updated) => setUsers((currentUsers) => (currentUsers ?? []).map((item) => item.id === updated.id ? updated : item))} onRetired={(id) => setUsers((currentUsers) => (currentUsers ?? []).filter((item) => item.id !== id))} />)}
            {users === null && !userError && <p className="text-muted text-sm">Loading users…</p>}
          </div>
        </section>
      )}

      {(current.canManageStudents || current.canManageGoals) && (
        <StudentAdmin
          canAddStudents={current.canManageStudents}
          canManageGoals={current.canManageGoals}
        />
      )}
      {current.canManageGoals && <DataReadinessAdmin />}
      {current.canManageColors && <ColorAdmin />}
      {current.canManageUsers && <AuditAdmin />}
    </main>
  );
}
