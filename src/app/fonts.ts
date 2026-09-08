import { Fraunces, Inter } from "next/font/google";

/**
 * Font definitions, loaded once and imported where needed.
 *
 * Both are exposed as CSS variables and wired into Tailwind's `--font-sans` /
 * `--font-display` tokens in `globals.css`, so components use `font-sans` and
 * `font-display` rather than referencing the font objects directly.
 */

/** UI face: labels, body copy, controls. */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Display face: page titles and section headings only — never repeated,
 * body-level text like link titles, where a display serif reads as noise
 * rather than hierarchy.
 *
 * Weight 600 keeps Fraunces sturdy at heading sizes; the thinner default
 * weight (as in e.g. Instrument Serif) reads as fragile once it's on screen
 * more than once. (`axes` needs `weight: "variable"` to apply, so it's
 * skipped here in favour of a single fixed weight.)
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  weight: "600",
  variable: "--font-fraunces",
});
