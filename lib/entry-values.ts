/** Empty input is missing evidence, not an observed zero. */
export function parseFluencyInput(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
