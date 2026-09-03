"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Student, Goal, Session, DataPoint } from "@/lib/db/types";
import {
  aggregateObservationEvents,
  evidenceUnitCount,
  localDateIso,
  type ObservationEntryKind,
} from "@/lib/observations";
import { measurementPlanStatus } from "@/lib/measurement-plans";
import { StudentCard } from "./StudentCard";
import { GridView } from "./GridView";
import { AccordionView } from "./AccordionView";
import { AddStudentCard } from "./AddStudentCard";
import type { EntryActions, EntryView } from "./types";
import { Walkthrough, TourLauncher } from "@/components/Walkthrough";
import { ENTRY_TOUR_STEPS, ENTRY_TOUR_KEY } from "@/lib/tour-steps";
import { useTour } from "@/lib/use-tour";

const PERIOD_LABEL = "Daily Log";
const PENDING_STORAGE_KEY = "iep-capture-pending-observations-v1";

const VIEW_OPTIONS: { value: EntryView; label: string }[] = [
  { value: "cards", label: "Card stack" },
  { value: "grid", label: "Grid" },
  { value: "accordion", label: "Accordion" },
];

type NewObservationKind = Exclude<ObservationEntryKind, "legacy_snapshot">;

type PendingObservation = {
  clientRequestId: string;
  staffId: string;
  goalId: string;
  sessionId: string;
  entryKind: NewObservationKind;
  entryAt: string;
  valueNumeric?: number;
  valueEnum?: string;
  note?: string | null;
  queuedAt: number;
};

function readPendingObservations(staffId: string): PendingObservation[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(`${PENDING_STORAGE_KEY}:${staffId}`) ?? "[]"
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PendingObservation =>
        item &&
        item.staffId === staffId &&
        typeof item.clientRequestId === "string" &&
        typeof item.goalId === "string" &&
        typeof item.sessionId === "string" &&
        typeof item.entryKind === "string" &&
        typeof item.entryAt === "string" &&
        typeof item.queuedAt === "number"
    );
  } catch {
    return [];
  }
}

function persistPendingObservations(
  staffId: string,
  items: Iterable<PendingObservation>
) {
  try {
    localStorage.setItem(
      `${PENDING_STORAGE_KEY}:${staffId}`,
      JSON.stringify([...items])
    );
  } catch {
    // A full/disabled localStorage still leaves the current in-memory queue.
  }
}

function pendingAsDataPoint(pending: PendingObservation): DataPoint {
  const at = new Date(pending.entryAt);
  return {
    id: pending.clientRequestId,
    goalId: pending.goalId,
    sessionId: pending.sessionId,
    enteredByStaffId: pending.staffId,
    entryAt: at,
    entryKind: pending.entryKind,
    clientRequestId: pending.clientRequestId,
    valueNumeric: pending.valueNumeric ?? null,
    valueEnum: pending.valueEnum ?? null,
    trialsTotal: null,
    trialsCorrect: null,
    note: pending.note ?? null,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
  };
}

export function EntryScreen({
  currentStaffId,
  currentStaffName,
  currentStaffRole,
}: {
  currentStaffId: string;
  currentStaffName: string;
  currentStaffRole: "teacher" | "aide";
}) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [goalsByStudent, setGoalsByStudent] = useState<Map<string, Goal[]>>(new Map());
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<EntryView>("cards");

  const eventsByGoalRef = useRef<Map<string, DataPoint[]>>(new Map());
  const goalsByIdRef = useRef<Map<string, Goal>>(new Map());
  const pendingRef = useRef<Map<string, PendingObservation>>(new Map());
  const savingIdsRef = useRef<Set<string>>(new Set());
  const failedIdsRef = useRef<Set<string>>(new Set());
  const lastSavedGoalsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number | null>>(new Map());
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const tour = useTour(ENTRY_TOUR_KEY, !!students && students.length > 0);

  const flushObservation = useCallback(async (pending: PendingObservation) => {
    if (savingIdsRef.current.has(pending.clientRequestId)) return;
    savingIdsRef.current.add(pending.clientRequestId);
    failedIdsRef.current.delete(pending.clientRequestId);
    bump();

    try {
      const body = {
        clientRequestId: pending.clientRequestId,
        goalId: pending.goalId,
        sessionId: pending.sessionId,
        entryKind: pending.entryKind,
        entryAt: pending.entryAt,
        ...(pending.valueNumeric !== undefined
          ? { valueNumeric: pending.valueNumeric }
          : {}),
        ...(pending.valueEnum !== undefined ? { valueEnum: pending.valueEnum } : {}),
        ...(pending.note !== undefined ? { note: pending.note } : {}),
      };
      const res = await apiFetch<{ dataPoint: DataPoint }>("/api/data-points", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const events = eventsByGoalRef.current.get(pending.goalId) ?? [];
      if (!events.some((event) => event.id === res.dataPoint.id)) {
        eventsByGoalRef.current.set(pending.goalId, [...events, res.dataPoint]);
      }
      pendingRef.current.delete(pending.clientRequestId);
      failedIdsRef.current.delete(pending.clientRequestId);
      lastSavedGoalsRef.current.add(pending.goalId);
      persistPendingObservations(currentStaffId, pendingRef.current.values());
    } catch (err) {
      const retryable =
        !(err instanceof ApiError) || err.status === 429 || err.status >= 500;
      if (retryable) {
        failedIdsRef.current.delete(pending.clientRequestId);
      } else {
        failedIdsRef.current.add(pending.clientRequestId);
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    } finally {
      savingIdsRef.current.delete(pending.clientRequestId);
      bump();
    }
  }, [currentStaffId]);

  const flushPending = useCallback(() => {
    for (const pending of pendingRef.current.values()) {
      if (failedIdsRef.current.has(pending.clientRequestId)) continue;
      void flushObservation(pending);
    }
  }, [flushObservation]);

  useEffect(() => {
    const id = setInterval(() => {
      if ([...timersRef.current.values()].some((startedAt) => startedAt)) bump();
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const retry = () => flushPending();
    window.addEventListener("online", retry);
    const interval = window.setInterval(retry, 15_000);
    return () => {
      window.removeEventListener("online", retry);
      window.clearInterval(interval);
    };
  }, [flushPending]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const sessionDate = localDateIso();
        const [studentsRes, goalsRes, sessionRes] = await Promise.all([
          apiFetch<{ students: Student[] }>("/api/students"),
          apiFetch<{ goals: Goal[] }>("/api/goals"),
          apiFetch<{ session: Session }>("/api/sessions", {
            method: "POST",
            body: JSON.stringify({ sessionDate, periodLabel: PERIOD_LABEL }),
          }),
        ]);
        if (cancelled) return;

        const byStudent = new Map<string, Goal[]>();
        for (const goal of goalsRes.goals) {
          const list = byStudent.get(goal.studentId) ?? [];
          list.push(goal);
          byStudent.set(goal.studentId, list);
        }
        goalsByIdRef.current = new Map(
          goalsRes.goals.map((goal) => [goal.id, goal])
        );

        const dpRes = await apiFetch<{ dataPoints: DataPoint[] }>(
          `/api/data-points?sessionId=${sessionRes.session.id}`
        );
        if (cancelled) return;
        const byGoal = new Map<string, DataPoint[]>();
        for (const dataPoint of dpRes.dataPoints) {
          const list = byGoal.get(dataPoint.goalId) ?? [];
          list.push(dataPoint);
          byGoal.set(dataPoint.goalId, list);
        }
        eventsByGoalRef.current = byGoal;

        const pending = readPendingObservations(currentStaffId);
        pendingRef.current = new Map(pending.map((item) => [item.clientRequestId, item]));

        setStudents(studentsRes.students);
        setGoalsByStudent(byStudent);
        setSession(sessionRes.session);
        bump();
        flushPending();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentStaffId, flushPending]);

  function goalForId(goalId: string): Goal | undefined {
    return goalsByIdRef.current.get(goalId);
  }

  function eventsForGoal(goalId: string): DataPoint[] {
    const saved = eventsByGoalRef.current.get(goalId) ?? [];
    const pending = [...pendingRef.current.values()]
      .filter((item) => item.goalId === goalId && item.sessionId === session?.id)
      .map(pendingAsDataPoint);
    return [...saved, ...pending];
  }

  function dataPointForGoal(goalId: string): DataPoint | undefined {
    const goal = goalForId(goalId);
    if (!goal) return undefined;
    const events = eventsForGoal(goalId);
    if (events.length === 0) return undefined;
    const latest = [...events]
      .sort((a, b) => new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime())
      .at(-1)!;
    const aggregate = aggregateObservationEvents(goal.metricType, events);
    return {
      ...latest,
      valueNumeric: aggregate.valueNumeric,
      valueEnum: aggregate.valueEnum,
      trialsTotal: aggregate.trialsTotal,
      trialsCorrect: aggregate.trialsCorrect,
      note: aggregate.note,
    };
  }

  function enqueueObservation(
    goalId: string,
    payload: Omit<
      PendingObservation,
      | "clientRequestId"
      | "staffId"
      | "goalId"
      | "sessionId"
      | "queuedAt"
      | "entryAt"
    >
  ) {
    if (!session) return;
    const pending: PendingObservation = {
      ...payload,
      clientRequestId: crypto.randomUUID(),
      staffId: currentStaffId,
      goalId,
      sessionId: session.id,
      queuedAt: Date.now(),
      entryAt: new Date().toISOString(),
    };
    pendingRef.current.set(pending.clientRequestId, pending);
    persistPendingObservations(currentStaffId, pendingRef.current.values());
    bump();
    void flushObservation(pending);
  }

  function latestUndoableEvent(goalId: string): DataPoint | undefined {
    if (
      [...savingIdsRef.current].some(
        (id) => pendingRef.current.get(id)?.goalId === goalId
      ) ||
      eventsForGoal(goalId).some((event) => savingIdsRef.current.has(event.id))
    ) {
      return undefined;
    }
    return eventsForGoal(goalId)
      .filter(
        (event) =>
          event.enteredByStaffId === currentStaffId && event.entryKind !== "legacy_snapshot"
      )
      .sort((a, b) => new Date(b.entryAt).getTime() - new Date(a.entryAt).getTime())[0];
  }

  async function undoLast(goalId: string) {
    const latest = latestUndoableEvent(goalId);
    if (!latest) return;

    if (latest.clientRequestId && pendingRef.current.has(latest.clientRequestId)) {
      pendingRef.current.delete(latest.clientRequestId);
      failedIdsRef.current.delete(latest.clientRequestId);
      persistPendingObservations(currentStaffId, pendingRef.current.values());
      lastSavedGoalsRef.current.add(goalId);
      bump();
      return;
    }

    savingIdsRef.current.add(latest.id);
    bump();
    try {
      await apiFetch(`/api/data-points/${latest.id}`, { method: "DELETE" });
      failedIdsRef.current.delete(latest.id);
      eventsByGoalRef.current.set(
        goalId,
        (eventsByGoalRef.current.get(goalId) ?? []).filter((event) => event.id !== latest.id)
      );
      lastSavedGoalsRef.current.add(goalId);
    } catch (err) {
      failedIdsRef.current.add(latest.id);
      setError(err instanceof Error ? err.message : "Undo failed.");
    } finally {
      savingIdsRef.current.delete(latest.id);
      bump();
    }
  }

  function timerSeconds(goalId: string): number {
    const saved = dataPointForGoal(goalId)?.valueNumeric ?? 0;
    const startedAt = timersRef.current.get(goalId);
    return startedAt ? saved + Math.floor((Date.now() - startedAt) / 1000) : saved;
  }

  async function logAccommodation(
    studentId: string,
    accommodationName: string,
    used: boolean,
    effectivenessRating: number | null
  ) {
    try {
      await apiFetch("/api/accommodation-logs", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          accommodationName,
          used,
          effectivenessRating,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accommodation save failed.");
    }
  }

  function saveStatusForGoal(goalId: string): ReturnType<EntryActions["saveStatusForGoal"]> {
    const pending = [...pendingRef.current.values()].filter((item) => item.goalId === goalId);
    if (pending.some((item) => failedIdsRef.current.has(item.clientRequestId))) return "failed";
    if (eventsForGoal(goalId).some((event) => failedIdsRef.current.has(event.id))) {
      return "failed";
    }
    if (pending.some((item) => savingIdsRef.current.has(item.clientRequestId))) return "saving";
    if (pending.length > 0) return "queued";
    return lastSavedGoalsRef.current.has(goalId) ? "saved" : "idle";
  }

  function handleStudentCreated(student: Student) {
    setStudents((prev) => [...(prev ?? []), student]);
    setGoalsByStudent((prev) => new Map(prev).set(student.id, []));
  }

  if (error && !students) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      </div>
    );
  }

  const actions: EntryActions = {
    dataPointForGoal,
    measurementStatusForGoal: (goalId) => {
      const goal = goalForId(goalId);
      const observationCount = goal?.measurementPlan
        ? evidenceUnitCount(goal.metricType, eventsForGoal(goalId), goal.measurementPlan)
        : aggregateObservationEvents(goal?.metricType ?? "accuracy_pct", eventsForGoal(goalId))
            .observationCount;
      return measurementPlanStatus(goal?.measurementPlan ?? null, {
        dateIso: localDateIso(),
        staffRole: currentStaffRole,
        observationCount,
      });
    },
    timerSecondsForGoal: timerSeconds,
    timerRunningForGoal: (goalId) => !!timersRef.current.get(goalId),
    onTapAccuracy: (goalId, correct) =>
      enqueueObservation(goalId, {
        entryKind: correct ? "correct_trial" : "incorrect_trial",
      }),
    onTapTally: (goalId) =>
      enqueueObservation(goalId, { entryKind: "tally", valueNumeric: 1 }),
    onCompleteObservation: (goalId) =>
      enqueueObservation(goalId, { entryKind: "observation_complete" }),
    onSetIconReading: (goalId, value) =>
      enqueueObservation(goalId, { entryKind: "rating", valueEnum: value }),
    onSetPromptLevel: (goalId, value) =>
      enqueueObservation(goalId, { entryKind: "rating", valueEnum: value }),
    onSetFluencyRate: (goalId, value) =>
      enqueueObservation(goalId, { entryKind: "numeric", valueNumeric: value }),
    onSetTaskStep: (goalId, step) =>
      enqueueObservation(goalId, { entryKind: "task_step", valueNumeric: step }),
    onSetAccommodationUsed: (goalId, used) =>
      enqueueObservation(goalId, {
        entryKind: "accommodation",
        valueEnum: used ? "used" : "not_used",
      }),
    onStartTimer: (goalId) => {
      if (timersRef.current.get(goalId)) return;
      timersRef.current.set(goalId, Date.now());
      bump();
    },
    onStopTimer: (goalId) => {
      const startedAt = timersRef.current.get(goalId);
      if (!startedAt) return;
      const seconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
      timersRef.current.set(goalId, null);
      enqueueObservation(goalId, { entryKind: "duration", valueNumeric: seconds });
    },
    onNoteBlur: (goalId, note) => {
      const normalized = note.trim() || null;
      if ((dataPointForGoal(goalId)?.note ?? null) !== normalized) {
        enqueueObservation(goalId, { entryKind: "note", note: normalized });
      }
    },
    canUndoForGoal: (goalId) => !!latestUndoableEvent(goalId),
    onUndoLast: (goalId) => void undoLast(goalId),
    saveStatusForGoal,
    onLogAccommodation: logAccommodation,
  };

  return (
    <main className="page w-full flex-1">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Roster sweep — {PERIOD_LABEL}</h1>
          <p className="text-muted mt-1">
            {currentStaffName} · {localDateIso()}
          </p>
        </div>
        <span className="tag tag-outline">Synthetic data only — pilot</span>
      </div>

      <div className="mb-4">
        <div className="seg" role="radiogroup" aria-label="Layout">
          {VIEW_OPTIONS.map((opt) => (
            <label key={opt.value} className="seg-opt">
              <input
                type="radio"
                name="layout"
                checked={view === opt.value}
                onChange={() => setView(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3" role="alert">
          <p className="text-sm" style={{ color: "#b91c1c" }}>
            {error}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {!students ? (
        <p className="text-muted text-sm">Loading roster…</p>
      ) : view === "cards" ? (
        <div className="flex flex-col gap-4">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              goals={goalsByStudent.get(student.id) ?? []}
              actions={actions}
            />
          ))}
          <AddStudentCard onCreated={handleStudentCreated} />
        </div>
      ) : view === "grid" ? (
        students.length === 0 ? (
          <p className="text-muted text-sm">
            No students assigned to your classroom yet — switch to Card stack or Accordion to add one.
          </p>
        ) : (
          <GridView students={students} goalsByStudent={goalsByStudent} actions={actions} />
        )
      ) : (
        <div className="flex flex-col gap-3">
          <AccordionView students={students} goalsByStudent={goalsByStudent} actions={actions} />
          <AddStudentCard onCreated={handleStudentCreated} />
        </div>
      )}

      <TourLauncher onClick={tour.launch} />
      <Walkthrough steps={ENTRY_TOUR_STEPS} open={tour.open} onClose={tour.close} />
    </main>
  );
}
