import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractErrorMessage(err: any, fallback = "Operation failed"): string {
  const msg = err?.response?.data?.message;
  if (!msg) return fallback;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg[0];
  if (typeof msg === 'object' && msg.message) {
    return Array.isArray(msg.message) ? msg.message[0] : msg.message;
  }
  return fallback;
}

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
