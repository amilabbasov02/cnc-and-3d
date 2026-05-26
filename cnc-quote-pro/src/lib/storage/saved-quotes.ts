/**
 * Browser-side quote persistence (localStorage).
 *
 * This is the demo stand-in for real per-user storage. The next milestone
 * replaces it with server-side accounts + a database, but the shape of a
 * SavedQuote stays the same so the UI won't have to change.
 */

const KEY = "machquote.saved";
export const SAVED_EVENT = "machquote:saved";

export interface SavedQuote {
  id: string;
  createdAt: number;
  materialName: string;
  dimensions: string;
  quantity: number;
  pricePerPart: number;
  totalPrice: number;
}

export function listQuotes(): SavedQuote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedQuote[]) : [];
  } catch {
    return [];
  }
}

export function saveQuote(q: Omit<SavedQuote, "id" | "createdAt">): void {
  if (typeof window === "undefined") return;
  const record: SavedQuote = { ...q, id: crypto.randomUUID(), createdAt: Date.now() };
  const next = [record, ...listQuotes()].slice(0, 50);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function deleteQuote(id: string): void {
  if (typeof window === "undefined") return;
  const next = listQuotes().filter((q) => q.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(SAVED_EVENT));
}
