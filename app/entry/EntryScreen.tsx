"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import type {
  DataPoint,
  Goal,
  Session,
  SessionAbsence,
  Student,
  StudentAccommodation,
} from "@/lib/db/types";
import type { ObservationDetails } from "@/lib/student-data-plan";
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
import { RosterGroupManager } from "./RosterGroupManager";
import { TimerView } from "./TimerView";
import type { EntryActions, EntryView } from "./types";
import {
  adjacentStudentId,
  DEFAULT_ENTRY_PREFERENCES,
  studentsInSelectedGroup,
  type EntryPreferences,
  type RosterGroupSummary,
  type WorkflowMode,
} from "@/lib/entry-workflow";
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

const WORKFLOW_OPTIONS: { value: WorkflowMode; label: string }[] = [
  { value: "roster", label: "Roster" },
  { value: "focus", label: "Focus" },
  { value: "timers", label: "Timers" },
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
  observationDetails?: ObservationDetails;
  opportunitiesObserved?: number;
  observationDurationSeconds?: number;
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
    observationDetails: pending.observationDetails ?? null,
    opportunitiesObserved: pending.opportunitiesObserved ?? null,
    observationDurationSeconds: pending.observationDurationSeconds ?? null,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
  };
}

export function EntryScreen({
  currentStaffId,
  currentStaffName,
  currentStaffRole,
  canManageStudents,
  canManageGoals,
}: {
  currentStaffId: string;
  currentStaffName: string;
  currentStaffRole: "teacher" | "aide";
  canManageStudents: boolean;
  canManageGoals: boolean;
}) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [goalsByStudent, setGoalsByStudent] = useState<Map<string, Goal[]>>(new Map());
  const [accommodationsByStudent, setAccommodationsByStudent] = useState<
    Map<string, StudentAccommodation[]>
  >(new Map());
  const [absencesByStudent, setAbsencesByStudent] = useState<Map<string, SessionAbsence>>(
    new Map()
  );
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<RosterGroupSummary[]>([]);
  const [view, setView] = useState<EntryView>(DEFAULT_ENTRY_PREFERENCES.layout);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>(
    DEFAULT_ENTRY_PREFERENCES.workflowMode
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [focusStudentId, setFocusStudentId] = useState<string | null>(null);
  const [preferenceStatus, setPreferenceStatus] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [showOptionalGoals, setShowOptionalGoals] = useState(false);
  const [today] = useState(() => localDateIso());

  const eventsByGoalRef = useRef<Map<string, DataPoint[]>>(new Map());
  const goalsByIdRef = useRef<Map<string, Goal>>(new Map());
  const pendingRef = useRef<Map<string, PendingObservation>>(new Map());
  const savingIdsRef = useRef<Set<string>>(new Set());
  const failedIdsRef = useRef<Set<string>>(new Set());
  const lastSavedGoalsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number | null>>(new Map());
  const absenceSavingRef = useRef<Set<string>>(new Set());
  const absenceFailedRef = useRef<Set<string>>(new Set());
  const preferenceQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const preferenceVersionRef = useRef(0);
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
        ...(pending.observationDetails !== undefined
          ? { observationDetails: pending.observationDetails }
          : {}),
        ...(pending.opportunitiesObserved !== undefined
          ? { opportunitiesObserved: pending.opportunitiesObserved }
          : {}),
        ...(pending.observationDurationSeconds !== undefined
          ? { observationDurationSeconds: pending.observationDurationSeconds }
          : {}),
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
        const [
          studentsRes,
          goalsRes,
          accommodationsRes,
          sessionRes,
          groupsRes,
          preferencesRes,
        ] = await Promise.all([
          apiFetch<{ students: Student[] }>("/api/students"),
          apiFetch<{ goals: Goal[] }>("/api/goals"),
          apiFetch<{ accommodations: StudentAccommodation[] }>(
            "/api/student-accommodations"
          ),
          apiFetch<{ session: Session }>("/api/sessions", {
            method: "POST",
            body: JSON.stringify({ sessionDate, periodLabel: PERIOD_LABEL }),
          }),
          apiFetch<{ groups: RosterGroupSummary[] }>("/api/roster-groups"),
          apiFetch<{ preferences: EntryPreferences }>("/api/entry-preferences"),
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
        const accommodationsMap = new Map<string, StudentAccommodation[]>();
        for (const accommodation of accommodationsRes.accommodations) {
          const list = accommodationsMap.get(accommodation.studentId) ?? [];
          list.push(accommodation);
          accommodationsMap.set(accommodation.studentId, list);
        }

        const [dpRes, absencesRes] = await Promise.all([
          apiFetch<{ dataPoints: DataPoint[] }>(
            `/api/data-points?sessionId=${sessionRes.session.id}`
          ),
          apiFetch<{ absences: SessionAbsence[] }>(
            `/api/session-absences?sessionId=${sessionRes.session.id}`
          ),
        ]);
        if (cancelled) return;
        const byGoal = new Map<string, DataPoint[]>();
        for (const dataPoint of dpRes.dataPoints) {
          const list = byGoal.get(dataPoint.goalId) ?? [];
          list.push(dataPoint);
          byGoal.set(dataPoint.goalId, list);
        }
        eventsByGoalRef.current = byGoal;
        const absenceMap = new Map<string, SessionAbsence>();
        for (const absence of absencesRes.absences) {
          absenceMap.set(absence.studentId, absence);
        }

        const pending = readPendingObservations(currentStaffId);
        pendingRef.current = new Map(pending.map((item) => [item.clientRequestId, item]));

        setStudents(studentsRes.students);
        setGoalsByStudent(byStudent);
        setAccommodationsByStudent(accommodationsMap);
        setAbsencesByStudent(absenceMap);
        setSession(sessionRes.session);
        setGroups(groupsRes.groups);
        setView(preferencesRes.preferences.layout);
        setWorkflowMode(preferencesRes.preferences.workflowMode);
        setSelectedGroupId(
          groupsRes.groups.some(
            (group) => group.id === preferencesRes.preferences.selectedGroupId
          )
            ? preferencesRes.preferences.selectedGroupId
            : null
        );
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
      opportunitiesObserved: aggregate.opportunitiesObserved,
      observationDurationSeconds: aggregate.observationDurationSeconds,
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
    effectivenessRating: number | null,
    context: {
      sessionId: string | null;
      goalId: string | null;
      setting: string | null;
      activity: string | null;
      implementationFidelity: number | null;
      reasonNotUsed: string | null;
    }
  ) {
    try {
      await apiFetch("/api/accommodation-logs", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          accommodationName,
          used,
          effectivenessRating,
          ...context,
          sessionId: context.sessionId ?? session?.id ?? null,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accommodation save failed.");
    }
  }

  async function toggleAbsence(studentId: string) {
    if (!session) return;
    const existing = absencesByStudent.get(studentId);
    absenceSavingRef.current.add(studentId);
    bump();
    try {
      if (existing) {
        await apiFetch(`/api/session-absences/${existing.id}`, { method: "DELETE" });
        setAbsencesByStudent((prev) => {
          const next = new Map(prev);
          next.delete(studentId);
          return next;
        });
      } else {
        const res = await apiFetch<{ absence: SessionAbsence }>("/api/session-absences", {
          method: "POST",
          body: JSON.stringify({ sessionId: session.id, studentId }),
        });
        setAbsencesByStudent((prev) => new Map(prev).set(studentId, res.absence));
      }
      absenceFailedRef.current.delete(studentId);
    } catch (err) {
      absenceFailedRef.current.add(studentId);
      setError(err instanceof Error ? err.message : "Attendance update failed.");
    } finally {
      absenceSavingRef.current.delete(studentId);
      bump();
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

  function savePreferences(preferences: EntryPreferences) {
    const version = ++preferenceVersionRef.current;
    setView(preferences.layout);
    setWorkflowMode(preferences.workflowMode);
    setSelectedGroupId(preferences.selectedGroupId);
    setPreferenceStatus("saving");
    preferenceQueueRef.current = preferenceQueueRef.current
      .catch(() => undefined)
      .then(() =>
        apiFetch<{ preferences: EntryPreferences }>("/api/entry-preferences", {
          method: "PUT",
          body: JSON.stringify(preferences),
        })
      )
      .then(() => {
        if (version === preferenceVersionRef.current) setPreferenceStatus("saved");
      })
      .catch((preferenceError) => {
        if (version !== preferenceVersionRef.current) return;
        setPreferenceStatus("failed");
        setError(
          preferenceError instanceof Error
            ? preferenceError.message
            : "Entry preferences could not be saved."
        );
      });
  }

  function updateGroups(nextGroups: RosterGroupSummary[]) {
    setGroups(nextGroups);
    if (selectedGroupId && !nextGroups.some((group) => group.id === selectedGroupId)) {
      setFocusStudentId(null);
      savePreferences({ layout: view, workflowMode, selectedGroupId: null });
    }
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
    accommodationsForStudent: (studentId) =>
      accommodationsByStudent.get(studentId) ?? [],
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
    onCompleteObservation: (goalId, exposure) =>
      enqueueObservation(goalId, {
        entryKind: "observation_complete",
        ...exposure,
      }),
    onSetIconReading: (goalId, value) =>
      enqueueObservation(goalId, { entryKind: "rating", valueEnum: value }),
    onSetPromptLevel: (goalId, value) =>
      enqueueObservation(goalId, { entryKind: "rating", valueEnum: value }),
    onSetFluencyRate: (goalId, value) =>
      enqueueObservation(goalId, { entryKind: "numeric", valueNumeric: value }),
    onLogRubric: (goalId, score, workSample, criterion) =>
      enqueueObservation(goalId, {
        entryKind: "rubric_score",
        valueNumeric: score,
        observationDetails: { kind: "rubric", workSample, criterion },
      }),
    onLogAbc: (goalId, antecedent, behavior, consequence) =>
      enqueueObservation(goalId, {
        entryKind: "abc_observation",
        observationDetails: { kind: "abc", antecedent, behavior, consequence },
      }),
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
    isStudentAbsent: (studentId) => absencesByStudent.has(studentId),
    absenceStatusForStudent: (studentId) => {
      if (absenceFailedRef.current.has(studentId)) return "failed";
      if (absenceSavingRef.current.has(studentId)) return "saving";
      return "idle";
    },
    onToggleAbsence: (studentId) => void toggleAbsence(studentId),
  };

  const visibleStudents = students
    ? studentsInSelectedGroup(students, groups, selectedGroupId)
    : [];
  const optionalGoalCount = visibleStudents.reduce(
    (count, student) =>
      count +
      (goalsByStudent.get(student.id) ?? []).filter(
        (goal) =>
          !measurementPlanStatus(goal.measurementPlan ?? null, {
            dateIso: today,
            staffRole: currentStaffRole,
            observationCount: 0,
          }).isDue
      ).length,
    0
  );
  const displayedGoalsByStudent = new Map(
    visibleStudents.map((student) => [
      student.id,
      (goalsByStudent.get(student.id) ?? []).filter(
        (goal) =>
          showOptionalGoals ||
          measurementPlanStatus(goal.measurementPlan ?? null, {
            dateIso: today,
            staffRole: currentStaffRole,
            observationCount: 0,
          }).isDue
      ),
    ])
  );
  const activeFocusStudentId = visibleStudents.some(
    (student) => student.id === focusStudentId
  )
    ? focusStudentId
    : (visibleStudents[0]?.id ?? null);
  const focusedStudent = visibleStudents.find(
    (student) => student.id === activeFocusStudentId
  );

  return (
    <main className="page w-full flex-1">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Classroom capture — {PERIOD_LABEL}</h1>
          <p className="text-muted mt-1">
            {currentStaffName} · {today}
          </p>
        </div>
        <span className="tag tag-outline">Synthetic data only — pilot</span>
      </div>

      <div data-tour="workflow-modes" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <p className="card-kicker mb-1">Workflow</p>
          <div className="seg" role="radiogroup" aria-label="Workflow mode">
            {WORKFLOW_OPTIONS.map((option) => (
              <label key={option.value} className="seg-opt">
                <input
                  type="radio"
                  name="workflow-mode"
                  checked={workflowMode === option.value}
                  onChange={() => {
                    setFocusStudentId(null);
                    savePreferences({
                      layout: view,
                      workflowMode: option.value,
                      selectedGroupId,
                    });
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <label data-tour="roster-group-filter" className="flex flex-col gap-1">
          <span className="card-kicker">Roster group</span>
          <select
            className="input"
            value={selectedGroupId ?? ""}
            onChange={(event) => {
              const groupId = event.target.value || null;
              setFocusStudentId(null);
              savePreferences({ layout: view, workflowMode, selectedGroupId: groupId });
            }}
          >
            <option value="">All students</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </label>

        <p className="text-muted text-xs" role="status" aria-live="polite">
          {preferenceStatus === "saving"
            ? "Saving preferences…"
            : preferenceStatus === "saved"
              ? "Preferences saved"
              : preferenceStatus === "failed"
                ? "Preferences not saved"
                : ""}
        </p>
      </div>

      {workflowMode === "roster" && (
        <div className="mb-4">
          <p className="card-kicker mb-1">Roster layout</p>
          <div className="seg" role="radiogroup" aria-label="Layout">
            {VIEW_OPTIONS.map((opt) => (
            <label key={opt.value} className="seg-opt">
              <input
                type="radio"
                name="layout"
                checked={view === opt.value}
                onChange={() =>
                  savePreferences({
                    layout: opt.value,
                    workflowMode,
                    selectedGroupId,
                  })
                }
              />
              {opt.label}
            </label>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="card-kicker">Goal visibility</p>
          <p className="text-muted mt-1 text-xs">
            Due today is the default. Optional and off-schedule collection remains available.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={showOptionalGoals}
          onClick={() => setShowOptionalGoals((current) => !current)}
        >
          {showOptionalGoals
            ? "Show due today only"
            : `Show optional goals (${optionalGoalCount})`}
        </button>
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

      {students && canManageStudents && (
        <div className="mb-4">
          <RosterGroupManager students={students} groups={groups} onChange={updateGroups} />
        </div>
      )}

      {!students ? (
        <p className="text-muted text-sm">Loading roster…</p>
      ) : workflowMode === "timers" ? (
        <TimerView
          students={visibleStudents}
          goalsByStudent={displayedGoalsByStudent}
          actions={actions}
        />
      ) : workflowMode === "focus" ? (
        focusedStudent ? (
          <div className="flex flex-col gap-3">
            <div className="card flex flex-wrap items-end justify-between gap-3">
              <label className="flex flex-col gap-1">
                <span className="card-kicker">Focused student</span>
                <select
                  className="input"
                  value={focusedStudent.id}
                  onChange={(event) => setFocusStudentId(event.target.value)}
                >
                  {visibleStudents.map((student) => (
                    <option key={student.id} value={student.id}>{student.displayName}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2" role="group" aria-label="Move between students">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setFocusStudentId(
                      adjacentStudentId(visibleStudents, focusedStudent.id, -1)
                    )
                  }
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setFocusStudentId(
                      adjacentStudentId(visibleStudents, focusedStudent.id, 1)
                    )
                  }
                >
                  Next →
                </button>
              </div>
            </div>
            <StudentCard
              student={focusedStudent}
              goals={displayedGoalsByStudent.get(focusedStudent.id) ?? []}
              actions={actions}
              canManageGoals={canManageGoals}
            />
          </div>
        ) : (
          <p className="text-muted text-sm">This roster group has no students.</p>
        )
      ) : view === "cards" ? (
        <div className="flex flex-col gap-4">
          {visibleStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              goals={displayedGoalsByStudent.get(student.id) ?? []}
              actions={actions}
              canManageGoals={canManageGoals}
            />
          ))}
          {!selectedGroupId && canManageStudents && (
            <AddStudentCard onCreated={handleStudentCreated} />
          )}
        </div>
      ) : view === "grid" ? (
        visibleStudents.length === 0 ? (
          <p className="text-muted text-sm">
            No students in this roster view.
          </p>
        ) : (
          <GridView students={visibleStudents} goalsByStudent={displayedGoalsByStudent} actions={actions} />
        )
      ) : (
        <div className="flex flex-col gap-3">
          <AccordionView students={visibleStudents} goalsByStudent={displayedGoalsByStudent} actions={actions} />
          {!selectedGroupId && canManageStudents && (
            <AddStudentCard onCreated={handleStudentCreated} />
          )}
        </div>
      )}

      <TourLauncher onClick={tour.launch} />
      <Walkthrough steps={ENTRY_TOUR_STEPS} open={tour.open} onClose={tour.close} />
    </main>
  );
}
