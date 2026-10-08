import assert from 'node:assert/strict';
import test from 'node:test';
import { encryptField, decryptField } from '../server/crypto';

test('field encryption rejects missing keys even when a session secret exists', () => {
  delete process.env.FIELD_ENCRYPTION_SECRET;
  process.env.SESSION_SECRET = 'test-session-secret-is-at-least-32-characters';
  assert.throws(() => encryptField('test-value'), /FIELD_ENCRYPTION_SECRET/);
  process.env.FIELD_ENCRYPTION_SECRET = 'short';
  assert.throws(() => encryptField('test-value'), /FIELD_ENCRYPTION_SECRET/);
});

test('encrypted fields survive session key rotation and reject tampering', () => {
  process.env.FIELD_ENCRYPTION_SECRET = 'test-field-key-is-at-least-32-characters';
  const encrypted = encryptField('synthetic-tax-id');
  process.env.SESSION_SECRET = 'a-different-session-key-with-at-least-32-characters';
  assert.equal(decryptField(encrypted), 'synthetic-tax-id');
  const parts = encrypted.split(':');
  parts[3] = `${parts[3][0] === '0' ? '1' : '0'}${parts[3].slice(1)}`;
  assert.throws(() => decryptField(parts.join(':')));
  process.env.FIELD_ENCRYPTION_SECRET = 'a-different-field-key-with-at-least-32-characters';
  assert.throws(() => decryptField(encrypted));
});
