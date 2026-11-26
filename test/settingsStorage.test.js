import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSavedSettings, saveSettings } from '../src/settingsStorage.js';

function withLocalStorage(storage, run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
}

function memoryStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
  };
}

const KEY = 'chess-board-nyp:settings';
const anyValue = () => true;

test('saveSettings stores only the user-facing settings and loadSavedSettings reads them back', () => {
  const storage = memoryStorage();
  withLocalStorage(storage, () => {
    saveSettings({ playbackSpeed: 1000, pieceStyle: 'chess24', theme: 'forest', showCoordinates: false, keyboard: true, flipped: true, locale: 'en' });
    assert.deepEqual(loadSavedSettings(anyValue), {
      playbackSpeed: 1000, pieceStyle: 'chess24', theme: 'forest', showCoordinates: false, keyboard: true,
    });
  });
});

test('loadSavedSettings drops values that the validator rejects', () => {
  withLocalStorage(memoryStorage({ [KEY]: JSON.stringify({ theme: 'neon', keyboard: false }) }), () => {
    assert.deepEqual(loadSavedSettings((key) => key !== 'theme'), { keyboard: false });
  });
});

test('loadSavedSettings returns nothing for corrupt JSON', () => {
  withLocalStorage(memoryStorage({ [KEY]: '{not json' }), () => {
    assert.deepEqual(loadSavedSettings(anyValue), {});
  });
});

test('settings still load and save when localStorage throws', () => {
  const blocked = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
  };
  withLocalStorage(blocked, () => {
    assert.deepEqual(loadSavedSettings(anyValue), {});
    assert.doesNotThrow(() => saveSettings({ theme: 'slate' }));
  });
});
