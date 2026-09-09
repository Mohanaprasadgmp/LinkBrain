/** The first letter of up to the first two words in a name, e.g. "Mohana Prasad" → "MP". */
export function initialsFromName(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .filter(Boolean);
  return letters.join("") || "?";
}
