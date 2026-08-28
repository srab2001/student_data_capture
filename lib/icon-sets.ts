/**
 * The four icon-degree sets a goal can use (docs/compliance.md, Phase 3
 * wireframe section 4). Configured once per goal at setup time — the
 * entry screen just renders whichever set the goal specifies.
 */
export type IconSetKey = "smiley_5" | "stars_5" | "thumbs_3" | "zones_4";

export const ICON_SETS: Record<
  IconSetKey,
  { value: string; glyph: string; label: string }[]
> = {
  smiley_5: [
    { value: "1_of_5", glyph: "😣", label: "1 of 5" },
    { value: "2_of_5", glyph: "😕", label: "2 of 5" },
    { value: "3_of_5", glyph: "😐", label: "3 of 5" },
    { value: "4_of_5", glyph: "🙂", label: "4 of 5" },
    { value: "5_of_5", glyph: "😄", label: "5 of 5" },
  ],
  stars_5: [
    { value: "1_of_5", glyph: "★☆☆☆☆", label: "1 of 5 stars" },
    { value: "2_of_5", glyph: "★★☆☆☆", label: "2 of 5 stars" },
    { value: "3_of_5", glyph: "★★★☆☆", label: "3 of 5 stars" },
    { value: "4_of_5", glyph: "★★★★☆", label: "4 of 5 stars" },
    { value: "5_of_5", glyph: "★★★★★", label: "5 of 5 stars" },
  ],
  thumbs_3: [
    { value: "down", glyph: "👎", label: "Thumbs down" },
    { value: "sideways", glyph: "🤏", label: "Thumbs sideways" },
    { value: "up", glyph: "👍", label: "Thumbs up" },
  ],
  zones_4: [
    { value: "blue", glyph: "🔵", label: "Blue zone" },
    { value: "green", glyph: "🟢", label: "Green zone" },
    { value: "yellow", glyph: "🟡", label: "Yellow zone" },
    { value: "red", glyph: "🔴", label: "Red zone" },
  ],
};

export const PROMPT_LEVELS: { value: string; label: string }[] = [
  { value: "full_physical", label: "Full Physical" },
  { value: "partial_physical", label: "Partial Physical" },
  { value: "gestural", label: "Gestural" },
  { value: "verbal", label: "Verbal" },
  { value: "independent", label: "Independent" },
];
