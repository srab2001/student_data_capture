"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Student } from "@/lib/db/types";

/** The dashed "+ Add student to roster" card, per the design handoff — collapsed by default, expands into a one-field form. Always creates a synthetic student (docs/compliance.md Track A guardrail). */
export function AddStudentCard({ onCreated }: { onCreated: (student: Student) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ student: Student }>("/api/students", {
        method: "POST",
        body: JSON.stringify({ displayName: name.trim() }),
      });
      onCreated(res.student);
      setName("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add student.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card w-full"
        style={{ borderStyle: "dashed", textAlign: "center", color: "var(--color-neutral-500)", cursor: "pointer" }}
      >
        + Add student to roster
      </button>
    );
  }

  return (
    <div className="card" style={{ borderStyle: "dashed" }}>
      <label className="text-muted flex flex-col text-xs">
        Student name
        <input
          type="text"
          autoFocus
          value={name}
          disabled={saving}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="e.g. Jordan T."
          className="input mt-1"
        />
      </label>
      {error && (
        <p className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={saving}
          className="btn btn-ghost"
        >
          Cancel
        </button>
        <button type="button" onClick={create} disabled={saving || !name.trim()} className="btn btn-primary">
          {saving ? "Adding…" : "Add student"}
        </button>
      </div>
    </div>
  );
}
