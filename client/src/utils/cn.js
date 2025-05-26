import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for combining class names with proper Tailwind CSS merging
 * @param {...any} inputs - Class names to combine
 * @returns {string} - Combined and merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
