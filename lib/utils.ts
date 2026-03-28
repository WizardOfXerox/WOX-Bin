import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return normalized || "paste";
}

export function normalizeOptionalSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function formatDate(value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) {
    return "Just now";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    ...options
  }).format(date);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeTagList(input: string[] | string | null | undefined) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => tag.slice(0, 32))
      )
    ).slice(0, 50);
  }

  return normalizeTagList(input.split(","));
}
