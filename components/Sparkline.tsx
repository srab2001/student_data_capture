/** Minimal inline-SVG trend line — no charting library needed for a
 * handful of points per goal. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const width = 160;
  const height = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Trend from ${values[0]} to ${values.at(-1)}`}
      className="text-amber-600 dark:text-amber-400"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
