import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving Tailwind conflicts (later wins). The standard
 * shadcn/ui helper used by every UI component for `className` overrides.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
