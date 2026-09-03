"use client";

import { useState } from "react";
import type { Student } from "@/lib/db/types";
import type { RosterGroupSummary } from "@/lib/entry-workflow";
import { apiFetch } from "@/lib/api-client";

type Draft = {
  id: string | null;
  name: string;
  studentIds: string[];
};

export function RosterGroupManager({
  students,
  groups,
  onChange,
}: {
  students: Student[];
  groups: RosterGroupSummary[];
  onChange: (groups: RosterGroupSummary[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function beginNew() {
    setDraft({ id: null, name: "", studentIds: [] });
    setMessage(null);
  }

  function beginEdit(group: RosterGroupSummary) {
    setDraft({ id: group.id, name: group.name, studentIds: group.studentIds });
    setMessage(null);
  }

  async function save() {
    if (!draft || !draft.name.trim() || draft.studentIds.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ group: RosterGroupSummary }>(
        draft.id ? `/api/roster-groups/${draft.id}` : "/api/roster-groups",
        {
          method: draft.id ? "PUT" : "POST",
          body: JSON.stringify({ name: draft.name, studentIds: draft.studentIds }),
        }
      );
      const next = draft.id
        ? groups.map((group) => (group.id === draft.id ? response.group : group))
        : [...groups, response.group];
      onChange([...next].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft(null);
      setMessage("Group saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Group could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function retire(group: RosterGroupSummary) {
    if (!window.confirm(`Retire the ${group.name} group? Student records are not removed.`)) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/api/roster-groups/${group.id}`, { method: "DELETE" });
      onChange(groups.filter((item) => item.id !== group.id));
      if (draft?.id === group.id) setDraft(null);
      setMessage("Group retired.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Group could not be retired.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" aria-label="Roster group manager">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 style={{ fontSize: 18 }}>Roster groups</h2>
          <p className="text-muted text-sm">Create instructional groups shared with classroom aides.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
            setDraft(null);
          }}
        >
          {open ? "Close groups" : "Manage groups"}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {groups.length === 0 ? (
            <p className="text-muted text-sm">No groups yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {groups.map((group) => (
                <li key={group.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{group.name}</strong>{" "}
                    <span className="text-muted text-sm">
                      {group.studentIds.length} student{group.studentIds.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    <button type="button" className="btn btn-ghost" onClick={() => beginEdit(group)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={saving}
                      onClick={() => void retire(group)}
                    >
                      Retire
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!draft ? (
            <button type="button" className="btn btn-secondary" onClick={beginNew}>
              + New group
            </button>
          ) : (
            <div className="card" style={{ background: "var(--color-surface)" }}>
              <label className="flex flex-col gap-1">
                <span className="text-sm" style={{ fontWeight: 600 }}>Group name</span>
                <input
                  className="input"
                  value={draft.name}
                  maxLength={80}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <fieldset className="mt-3">
                <legend className="text-sm" style={{ fontWeight: 600 }}>Students</legend>
                <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                  {students.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center gap-2 text-sm"
                      style={{ minHeight: 44 }}
                    >
                      <input
                        type="checkbox"
                        checked={draft.studentIds.includes(student.id)}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            studentIds: event.target.checked
                              ? [...draft.studentIds, student.id]
                              : draft.studentIds.filter((id) => id !== student.id),
                          })
                        }
                      />
                      {student.displayName}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving || !draft.name.trim() || draft.studentIds.length === 0}
                  onClick={() => void save()}
                >
                  {saving ? "Saving…" : "Save group"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
        </div>
      )}
    </section>
  );
}
