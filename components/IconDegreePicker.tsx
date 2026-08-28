"use client";

import { ICON_SETS, type IconSetKey } from "@/lib/icon-sets";

/**
 * A row of tappable icons that records a single reading — it does not
 * increment a running count (Phase 3 wireframe). Shared between
 * icon_scale goals and accommodation_logs' effectivenessRating, per the
 * Phase 3 instruction to reuse one control rather than build a second.
 */
export function IconDegreePicker({
  iconSet,
  value,
  onChange,
  label,
  disabled,
}: {
  iconSet: IconSetKey;
  value: string | null | undefined;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const options = ICON_SETS[iconSet];

  return (
    <div role="group" aria-label={label}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={opt.label}
              title={opt.label}
              onClick={() => onChange(opt.value)}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-2 text-lg transition-colors ${
                selected
                  ? "border-amber-600 bg-amber-100 dark:border-amber-500 dark:bg-amber-950"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              } disabled:opacity-50`}
            >
              <span aria-hidden="true">{opt.glyph}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 1-5 star rating, built on the same picker for accommodation effectiveness. */
export function EffectivenessRatingPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <IconDegreePicker
      iconSet="stars_5"
      value={value ? `${value}_of_5` : null}
      onChange={(v) => onChange(Number(v.split("_")[0]))}
      label="Effectiveness rating"
      disabled={disabled}
    />
  );
}
