const KEY = 'fleet:lastChange';

export interface LastChange {
  timestamp: string;
  userName: string;
}

export function getLastChange(): LastChange | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastChange) : null;
  } catch {
    return null;
  }
}

export function recordChange(userName: string): void {
  const entry: LastChange = { timestamp: new Date().toISOString(), userName };
  localStorage.setItem(KEY, JSON.stringify(entry));
  window.dispatchEvent(new Event('fleet:lastChange'));
}
