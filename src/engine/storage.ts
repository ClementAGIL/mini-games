// localStorage access. Storage can be unavailable (private mode, WebView settings, full), so nothing here throws.

export function loadJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full: the data is simply not kept */
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

/** Best score (or wave) of a game, 0 when none. */
export const loadBest = (game: string) => Number(loadJson<number>(`${game}.best`)) || 0;

export const saveBest = (game: string, value: number) => saveJson(`${game}.best`, value);
