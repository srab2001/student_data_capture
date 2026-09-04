"use client";

import { useState } from "react";

/**
 * Vendor attribution only — this app's own identity stays "IEP Capture
 * Pilot" for the district. Hides the mark rather than showing a broken
 * image if /public/asr-logo.png hasn't been added yet.
 */
export function Footer() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <footer
      className="mt-auto flex items-center justify-center gap-2 px-4 py-3 text-xs"
      style={{ borderTop: "1px solid var(--color-neutral-300)", color: "var(--color-neutral-600)" }}
    >
      {!logoFailed && (
        // eslint-disable-next-line @next/next/no-img-element -- tiny fixed-size attribution mark, not a page asset worth next/image's overhead
        <img
          src="/asr-logo.png"
          alt=""
          width={18}
          height={18}
          onError={() => setLogoFailed(true)}
          style={{ borderRadius: 4 }}
        />
      )}
      <span>Built by ASR Digital Services</span>
    </footer>
  );
}
