export type ListeningHistoryEntry = {
  id: string;
  title: string;
  creator: string;
  mimeType: string | null;
  position: number;
  duration: number;
  updatedAt: number;
};

export const LISTENING_HISTORY_KEY = 'radio-listening-history-v1';
const MAX_HISTORY = 30;

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function readListeningHistory(): ListeningHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LISTENING_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
      .map((item) => ({
        id: item.id,
        title: item.title,
        creator: typeof item.creator === 'string' ? item.creator : 'راديو',
        mimeType: typeof item.mimeType === 'string' ? item.mimeType : null,
        position: safeNumber(item.position),
        duration: safeNumber(item.duration),
        updatedAt: safeNumber(item.updatedAt) || Date.now(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function savedPositionFor(id: string) {
  const entry = readListeningHistory().find((item) => item.id === id);
  if (!entry || !entry.duration || entry.position / entry.duration >= 0.96) return 0;
  return entry.position;
}

export function writeListeningProgress(input: Omit<ListeningHistoryEntry, 'updatedAt'>) {
  if (typeof window === 'undefined') return;
  const duration = safeNumber(input.duration);
  const rawPosition = safeNumber(input.position);
  const position = duration > 0 && rawPosition / duration >= 0.96 ? 0 : rawPosition;
  const nextEntry: ListeningHistoryEntry = {
    ...input,
    position,
    duration,
    updatedAt: Date.now(),
  };
  const rest = readListeningHistory().filter((item) => item.id !== input.id);
  localStorage.setItem(LISTENING_HISTORY_KEY, JSON.stringify([nextEntry, ...rest].slice(0, MAX_HISTORY)));
  window.dispatchEvent(new CustomEvent('radio-history-changed'));
}

export function removeListeningHistory(id: string) {
  if (typeof window === 'undefined') return;
  const next = readListeningHistory().filter((item) => item.id !== id);
  localStorage.setItem(LISTENING_HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('radio-history-changed'));
}

export function clearListeningHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LISTENING_HISTORY_KEY);
  window.dispatchEvent(new CustomEvent('radio-history-changed'));
}
