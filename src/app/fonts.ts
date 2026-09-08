import { Inter } from "next/font/google";

/**
 * The one font used across the entire app. Headings are set apart by weight
 * and size, not a second typeface — see globals.css's `--font-sans` token.
 */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
