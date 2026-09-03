"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ClientIntervention } from "./types";

export function InterventionPanel({
  goalId,
  interventions,
  canManage,
  onChanged,
  rangeFrom,
  rangeTo,
}: {
  goalId: string;
  interventions: ClientIntervention[];
  canManage: boolean;
  onChanged: () => void;
  rangeFrom: string;
  rangeTo: string;
}) {
  const [date, setDate] = useState(rangeTo);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const interventionDate = date >= rangeFrom && date <= rangeTo ? date : rangeTo;

  async function addIntervention(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/interventions", {
        method: "POST",
        body: JSON.stringify({ goalId, interventionDate, description }),
      });
      setDescription("");
      setMessage("Intervention marker added.");
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add intervention.");
    } finally {
      setSaving(false);
    }
  }

  async function removeIntervention(id: string) {
    if (!confirm("Remove this intervention annotation?")) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/interventions/${id}`, { method: "DELETE" });
      setMessage("Intervention marker removed.");
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove intervention.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 border-t pt-4" style={{ borderColor: "var(--color-neutral-300)" }}>
      <h3 className="text-sm font-semibold">Intervention annotations</h3>
      <p className="text-muted mt-1 text-xs">
        Mark instructional or support changes so the chart can be interpreted in context. Do not
        include confidential narrative details.
      </p>

      {interventions.length > 0 ? (
        <ol className="mt-3 flex flex-col gap-2">
          {interventions.map((annotation, index) => (
            <li key={annotation.id} className="flex items-start justify-between gap-3 text-xs">
              <span>
                <strong>I{index + 1} · {annotation.interventionDate}</strong>
                <span className="mt-0.5 block">{annotation.description}</span>
              </span>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 44, color: "#b91c1c" }}
                  disabled={saving}
                  onClick={() => removeIntervention(annotation.id)}
                  aria-label={`Remove intervention from ${annotation.interventionDate}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted mt-3 text-xs">No intervention changes marked in this range.</p>
      )}

      {canManage && (
        <form onSubmit={addIntervention} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
          <label className="text-muted flex flex-col text-xs">
            Change date
            <input
              type="date"
              value={interventionDate}
              min={rangeFrom}
              max={rangeTo}
              onChange={(event) => setDate(event.target.value)}
              required
              disabled={saving}
              className="input mt-1"
            />
          </label>
          <label className="text-muted flex flex-col text-xs">
            Brief description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              minLength={1}
              maxLength={500}
              disabled={saving}
              placeholder="e.g. Began visual task checklist"
              className="input mt-1"
            />
          </label>
          <button type="submit" disabled={saving || !interventionDate || !description.trim()} className="btn btn-secondary">
            {saving ? "Adding…" : "Add marker"}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mt-2 text-xs" style={{ color: "#b91c1c" }}>{error}</p>}
      {message && <p role="status" aria-live="polite" className="text-muted mt-2 text-xs">{message}</p>}
    </section>
  );
}
