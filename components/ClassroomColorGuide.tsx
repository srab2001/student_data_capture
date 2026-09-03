"use client";

import { useEffect, useId, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ClassroomColor } from "@/lib/db/types";

export function ColorMeaning({
  color,
  compact = false,
}: {
  color: Pick<ClassroomColor, "id" | "name" | "hexValue" | "hoverComment">;
  compact?: boolean;
}) {
  const instanceId = useId();
  const descriptionId = `color-comment-${color.id}-${instanceId.replace(/:/g, "")}`;
  return (
    <span className="color-meaning">
      <span
        tabIndex={0}
        role="img"
        className="color-meaning-trigger"
        aria-label={`${color.name}: ${color.hoverComment}`}
        aria-describedby={descriptionId}
      >
        <span
          className="color-swatch"
          style={{ backgroundColor: color.hexValue }}
          aria-hidden="true"
        />
        {!compact && <span>{color.name}</span>}
      </span>
      <span id={descriptionId} role="tooltip" className="color-tooltip">
        <strong>{color.name}</strong>
        <span>{color.hoverComment}</span>
      </span>
    </span>
  );
}

export function ClassroomColorGuide() {
  const [colors, setColors] = useState<ClassroomColor[]>([]);

  useEffect(() => {
    apiFetch<{ colors: ClassroomColor[] }>("/api/color-settings")
      .then((response) => setColors(response.colors))
      .catch(() => setColors([]));
  }, []);

  if (colors.length === 0) return null;

  return (
    <details className="color-guide">
      <summary>Color guide</summary>
      <div className="color-guide-panel" aria-label="Classroom color meanings">
        <p className="text-muted text-xs">Hover or focus a color for its meaning.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {colors.map((color) => (
            <ColorMeaning key={color.id} color={color} />
          ))}
        </div>
      </div>
    </details>
  );
}
