import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function colorToken(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`Missing CSS color token: ${name}`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe("shared color accessibility", () => {
  it("keeps muted small text at WCAG AA contrast", () => {
    expect(css).toMatch(/\.text-muted\s*\{[^}]*var\(--color-neutral-700\)/);
    expect(contrast(colorToken("neutral-700"), colorToken("bg"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps primary button labels at WCAG AA contrast", () => {
    expect(css).toMatch(/\.btn-primary\s*\{[^}]*var\(--color-accent-700\)/);
    expect(contrast("#ffffff", colorToken("accent-700"))).toBeGreaterThanOrEqual(4.5);
  });
});
