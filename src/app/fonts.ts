import { Instrument_Serif, Inter } from "next/font/google";

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
 * Display face: page titles and section headings.
 *
 * Instrument Serif ships a single weight, so `weight` is required here — it is
 * designed to be set large at regular weight, which is exactly how it is used.
 */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-instrument-serif",
});
