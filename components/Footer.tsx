"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Vendor attribution only — this app's own identity stays "IEP Capture
 * Pilot" for the district. Hides the mark (rather than showing a broken
 * image) if /public/asr-logo.png is ever removed. next/image resizes the
 * source file down to this footer's fixed 18px mark instead of shipping
 * it at full resolution.
 */
export function Footer() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <footer
      className="mt-auto flex items-center justify-center gap-2 px-4 py-3 text-xs"
      style={{ borderTop: "1px solid var(--color-neutral-300)", color: "var(--color-neutral-600)" }}
    >
      {!logoFailed && (
        <Image
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
