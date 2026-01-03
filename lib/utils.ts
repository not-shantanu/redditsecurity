import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getChillyColor(score: number): string {
  if (score >= 0.9) return "bg-blue-900 text-blue-100"; // Deep Blue
  if (score >= 0.8) return "bg-blue-800 text-blue-100";
  if (score >= 0.7) return "bg-blue-700 text-blue-100";
  if (score >= 0.6) return "bg-blue-600 text-blue-100";
  if (score >= 0.4) return "bg-blue-500 text-blue-100";
  return "bg-gray-600 text-gray-100"; // Cold
}

export function getChillyLabel(score: number): string {
  if (score >= 0.9) return "Chilly";
  if (score >= 0.7) return "Cool";
  if (score >= 0.4) return "Luke-Warm";
  return "Cold";
}

