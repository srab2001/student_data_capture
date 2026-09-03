/**
 * Escape a CSV cell and neutralize spreadsheet formula prefixes in
 * teacher-entered text. The leading apostrophe is displayed as text by common
 * spreadsheet programs and prevents =, +, -, @, tab, or carriage return from
 * being interpreted as a formula.
 */
export function csvEscape(value: string): string {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(safeValue)) return `"${safeValue.replace(/"/g, '""')}"`;
  return safeValue;
}
