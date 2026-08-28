import { useEffect, useState } from "react";

/**
 * Drives a Walkthrough: auto-opens once per browser (tracked in
 * localStorage) as soon as `ready` flips true — i.e. once the page's own
 * data has actually loaded, not on mount — and exposes `launch` so a
 * "? Take the tour" button can always re-open it regardless of that
 * history. localStorage failures (private browsing, blocked storage)
 * degrade to "always show once per page load" rather than throwing.
 */
export function useTour(storageKey: string, ready: boolean) {
  const [open, setOpen] = useState(false);
  const [autoLaunched, setAutoLaunched] = useState(false);

  // A genuine one-time effect, not a render-time state adjustment: it
  // reads localStorage, which doesn't exist during server rendering and
  // must not be touched outside a browser-only lifecycle hook.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!ready || autoLaunched) return;
    setAutoLaunched(true);
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === "done";
    } catch {
      seen = false;
    }
    if (!seen) setOpen(true);
  }, [ready, autoLaunched, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(storageKey, "done");
    } catch {
      // Best-effort only — nothing to fall back to for persistence.
    }
  }

  function launch() {
    setOpen(true);
  }

  return { open, close, launch };
}
