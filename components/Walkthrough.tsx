"use client";

import { useEffect, useRef, useState } from "react";
import type { TourStep } from "@/lib/tour-steps";

const HIGHLIGHT_CLASSES = ["relative", "z-40"];
const HIGHLIGHT_STYLE = "0 0 0 4px var(--color-accent-300)";

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
        (highlightedRef.current as HTMLElement).style.boxShadow = "";
        (highlightedRef.current as HTMLElement).style.borderRadius = "";
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
        (el as HTMLElement).style.boxShadow = HIGHLIGHT_STYLE;
        (el as HTMLElement).style.borderRadius = "var(--radius-md)";
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
      <div className="fixed inset-0 z-30" style={{ background: "rgba(32, 30, 29, 0.4)" }} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Guided tour"
        className="card elev-sm fixed inset-x-4 bottom-4 z-50 mx-auto sm:right-4 sm:left-auto"
        style={{ maxWidth: 384, boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted text-xs">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <button type="button" onClick={onClose} aria-label="Close tour" className="btn btn-ghost btn-icon">
            ✕
          </button>
        </div>

        <h3 className="mt-1">{step.title}</h3>
        <p className="text-muted mt-1.5 text-sm leading-6">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Skip tour
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <button type="button" onClick={() => setStepIndex((i) => i - 1)} className="btn btn-secondary">
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setStepIndex((i) => i + 1))}
              className="btn btn-primary"
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
      className="btn btn-secondary elev-sm fixed bottom-4 left-4 z-20"
    >
      ? Take the tour
    </button>
  );
}
