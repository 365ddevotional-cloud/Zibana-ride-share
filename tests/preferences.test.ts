import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPreference, readTheme, savePreference } from '../client/src/lib/preferences';

test('preferences survive a reload and reject corrupted themes', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const items = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  } } });
  try {
    assert.equal(readTheme('theme', 'system'), 'system');
    savePreference('theme', 'dark');
    assert.equal(readTheme('theme', 'system'), 'dark');
    savePreference('theme', 'bad-value');
    assert.equal(readTheme('theme', 'system'), 'system');
    savePreference('tour', 'seen');
    assert.equal(readPreference('tour'), 'seen');
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('blocked storage does not crash the theme or first-use guide', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    get localStorage() { throw new Error('Storage unavailable'); },
  } });
  try {
    assert.equal(readTheme('theme', 'system'), 'system');
    assert.equal(readPreference('tour'), null);
    assert.doesNotThrow(() => savePreference('theme', 'light'));
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
