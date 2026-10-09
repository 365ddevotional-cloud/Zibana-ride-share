import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNavigationDeepLink } from '../client/src/lib/navigation';

test('driver navigation accepts equator and prime-meridian coordinates', () => {
  for (const provider of ['google_maps', 'apple_maps', 'waze', 'other'] as const) {
    const link = getNavigationDeepLink(provider, 0, 0);
    assert.ok(link.fallbackUrl.startsWith('https://'));
    assert.ok(link.fallbackUrl.includes('0,0'));
  }
});
test('invalid coordinates cannot be sent to navigation providers', () => {
  for (const [lat, lng] of [[91, 0], [0, 181], [NaN, 0], [0, Infinity]]) {
    assert.throws(() => getNavigationDeepLink('google_maps', lat, lng));
  }
});
