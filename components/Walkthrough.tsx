"use client";

import { useEffect, useRef, useState } from "react";
import type { TourStep } from "@/lib/tour-steps";

const HIGHLIGHT_CLASSES = [
  "ring-4",
  "ring-amber-400",
  "ring-offset-2",
  "dark:ring-offset-zinc-950",
  "relative",
  "z-40",
];

/**
 * A lightweight, non-blocking guided tour: a floating card that steps
 * through `steps`, scrolling to and highlighting each step's target
 * element. Deliberately not a hard modal — the dimmed backdrop doesn't
 * capture clicks, so a teacher can abandon the tour and start tapping
 * around mid-walkthrough without getting stuck.
 */
export function Walkthrough({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const highlightedRef = useRef<Element | null>(null);

  // Reset to step 0 whenever the tour transitions from closed to open —
  // an "adjust state while rendering" case (react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes),
  // not a real effect, since it only synchronizes internal state with a
  // prop rather than talking to anything outside React.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStepIndex(0);
  }

  useEffect(() => {
    function clearHighlight() {
      if (highlightedRef.current) {
        highlightedRef.current.classList.remove(...HIGHLIGHT_CLASSES);
        highlightedRef.current = null;
      }
    }

    if (!open) {
      clearHighlight();
      return;
    }

    const step = steps[stepIndex];
    clearHighlight();

    if (step?.target) {
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add(...HIGHLIGHT_CLASSES);
        highlightedRef.current = el;
      }
    }

    return clearHighlight;
  }, [open, stepIndex, steps]);

  if (!open) return null;
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Guided tour"
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg sm:right-4 sm:left-auto dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="min-h-11 min-w-11 -mr-2 -mt-2 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <h2 className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-50">
          {step.title}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="min-h-11 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setStepIndex((i) => i + 1))}
              className="min-h-11 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Small floating button that (re)launches a tour on demand. */
export function TourLauncher({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-4 left-4 z-20 min-h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      ? Take the tour
    </button>
  );
}
