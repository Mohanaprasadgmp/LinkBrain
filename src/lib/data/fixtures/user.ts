import type { User } from "@/lib/domain/types";

/**
 * The placeholder account.
 *
 * Hard-coded until authentication exists. Every component reads the current
 * user through this single value, so swapping in a real session later is a
 * change in one place rather than a hunt through the UI.
 */
export const CURRENT_USER: User = {
  id: "user-local",
  name: "Mohana Prasad",
  email: "mohanaprasadgmp@gmail.com",
  initials: "MP",
};
