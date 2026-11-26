const STORAGE_KEY = 'chess-board-nyp:settings';
const PERSISTED_KEYS = ['playbackSpeed', 'pieceStyle', 'theme', 'showCoordinates', 'keyboard', 'showLastMoveArrow'];

export function loadSavedSettings(isValid) {
  let stored;
  try {
    stored = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
  if (!stored || typeof stored !== 'object') return {};

  const saved = {};
  for (const key of PERSISTED_KEYS) {
    if (key in stored && isValid(key, stored[key])) saved[key] = stored[key];
  }
  return saved;
}

export function saveSettings(settings) {
  const values = Object.fromEntries(PERSISTED_KEYS.map((key) => [key, settings[key]]));
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Storage can be blocked or full; the settings still apply for this page view.
  }
}
