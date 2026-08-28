"use client";

import { useEffect, useReducer, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Student, Goal, Session, DataPoint } from "@/lib/db/types";
import { StudentCard } from "./StudentCard";

const PERIOD_LABEL = "Daily Log";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EntryScreen({ currentStaffName }: { currentStaffName: string }) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [goalsByStudent, setGoalsByStudent] = useState<Map<string, Goal[]>>(new Map());
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);

  // Source of truth for data points and timers is kept in refs so rapid
  // taps read the latest value synchronously; `version` forces a
  // re-render whenever a ref changes. This keeps every tap an
  // independent write to the Phase 2 API (autosave — see Phase 3
  // wireframe), never batched client-side state the Chromebook could
  // lose if it closes mid-period.
  const dpByGoalRef = useRef<Map<string, DataPoint>>(new Map());
  const timersRef = useRef<Map<string, { startedAt: number | null; baseSeconds: number }>>(
    new Map()
  );
  const queueRef = useRef<Map<string, Promise<unknown>>>(new Map());
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const id = setInterval(() => {
      if ([...timersRef.current.values()].some((t) => t.startedAt)) bump();
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [studentsRes, goalsRes, sessionRes] = await Promise.all([
          apiFetch<{ students: Student[] }>("/api/students"),
          apiFetch<{ goals: Goal[] }>("/api/goals"),
          apiFetch<{ session: Session }>("/api/sessions", {
            method: "POST",
            body: JSON.stringify({ sessionDate: todayIso(), periodLabel: PERIOD_LABEL }),
          }),
        ]);
        if (cancelled) return;

        const byStudent = new Map<string, Goal[]>();
        for (const goal of goalsRes.goals) {
          const list = byStudent.get(goal.studentId) ?? [];
          list.push(goal);
          byStudent.set(goal.studentId, list);
        }

        const dpRes = await apiFetch<{ dataPoints: DataPoint[] }>(
          `/api/data-points?sessionId=${sessionRes.session.id}`
        );
        if (cancelled) return;
        for (const dp of dpRes.dataPoints) {
          dpByGoalRef.current.set(dp.goalId, dp);
        }

        setStudents(studentsRes.students);
        setGoalsByStudent(byStudent);
        setSession(sessionRes.session);
        bump();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const upsertDataPoint = useCallback(
    (goalId: string, partial: Record<string, unknown>) => {
      if (!session) return;
      const prev = queueRef.current.get(goalId) ?? Promise.resolve();
      const next = prev
        .then(async () => {
          setSavingCount((c) => c + 1);
          const existing = dpByGoalRef.current.get(goalId);
          const res = existing
            ? await apiFetch<{ dataPoint: DataPoint }>(`/api/data-points/${existing.id}`, {
                method: "PATCH",
                body: JSON.stringify(partial),
              })
            : await apiFetch<{ dataPoint: DataPoint }>("/api/data-points", {
                method: "POST",
                body: JSON.stringify({ goalId, sessionId: session.id, ...partial }),
              });
          dpByGoalRef.current.set(goalId, res.dataPoint);
          bump();
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Save failed."))
        .finally(() => setSavingCount((c) => c - 1));
      queueRef.current.set(goalId, next);
    },
    [session]
  );

  function tapAccuracy(goalId: string, correct: boolean) {
    const existing = dpByGoalRef.current.get(goalId);
    const trialsTotal = (existing?.trialsTotal ?? 0) + 1;
    const trialsCorrect = (existing?.trialsCorrect ?? 0) + (correct ? 1 : 0);
    upsertDataPoint(goalId, { trialsTotal, trialsCorrect });
  }

  function tapTally(goalId: string) {
    const existing = dpByGoalRef.current.get(goalId);
    upsertDataPoint(goalId, { valueNumeric: (existing?.valueNumeric ?? 0) + 1 });
  }

  function startTimer(goalId: string) {
    const t = timersRef.current.get(goalId) ?? { startedAt: null, baseSeconds: 0 };
    if (t.startedAt) return;
    t.startedAt = Date.now();
    timersRef.current.set(goalId, t);
    bump();
  }

  function stopTimer(goalId: string) {
    const t = timersRef.current.get(goalId);
    if (!t?.startedAt) return;
    const seconds = t.baseSeconds + Math.floor((Date.now() - t.startedAt) / 1000);
    timersRef.current.set(goalId, { startedAt: null, baseSeconds: seconds });
    bump();
    upsertDataPoint(goalId, { valueNumeric: seconds });
  }

  function timerSeconds(goalId: string): number {
    const t = timersRef.current.get(goalId);
    if (!t) return 0;
    return t.startedAt
      ? t.baseSeconds + Math.floor((Date.now() - t.startedAt) / 1000)
      : t.baseSeconds;
  }

  async function logAccommodation(
    studentId: string,
    accommodationName: string,
    used: boolean,
    effectivenessRating: number
  ) {
    try {
      setSavingCount((c) => c + 1);
      await apiFetch("/api/accommodation-logs", {
        method: "POST",
        body: JSON.stringify({ studentId, accommodationName, used, effectivenessRating }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingCount((c) => c - 1);
    }
  }

  if (error && !students) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Roster sweep — {PERIOD_LABEL}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            {currentStaffName} · {todayIso()}
            {savingCount > 0 && " · saving…"}
          </p>
        </div>
        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-mono text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Synthetic data only
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {!students ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">Loading roster…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          No students assigned to your classroom yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              goals={goalsByStudent.get(student.id) ?? []}
              dataPointForGoal={(goalId) => dpByGoalRef.current.get(goalId)}
              timerSecondsForGoal={timerSeconds}
              timerRunningForGoal={(goalId) => !!timersRef.current.get(goalId)?.startedAt}
              onTapAccuracy={tapAccuracy}
              onTapTally={tapTally}
              onSetIconReading={(goalId, value) => upsertDataPoint(goalId, { valueEnum: value })}
              onSetPromptLevel={(goalId, value) => upsertDataPoint(goalId, { valueEnum: value })}
              onSetFluencyRate={(goalId, value) =>
                upsertDataPoint(goalId, { valueNumeric: value })
              }
              onSetTaskStep={(goalId, step) => upsertDataPoint(goalId, { valueNumeric: step })}
              onSetAccommodationUsed={(goalId, used) =>
                upsertDataPoint(goalId, { valueEnum: used ? "used" : "not_used" })
              }
              onStartTimer={startTimer}
              onStopTimer={stopTimer}
              onNoteBlur={(goalId, note) => upsertDataPoint(goalId, { note: note || null })}
              onLogAccommodation={logAccommodation}
            />
          ))}
        </div>
      )}
    </main>
  );
}
