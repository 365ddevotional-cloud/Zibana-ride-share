import assert from 'node:assert/strict';
import test from 'node:test';
import { activeTrip, tripParticipant, liveLink, validIdentity } from '../server/tracking-policy';
test('anonymous, fake and expired sessions cannot authorize live tracking', () => {
  assert.equal(validIdentity(undefined), null);
  assert.equal(validIdentity({ claims: { sub: 'dev-user' }, expires_at: Date.now()/1000+60 }), null);
  assert.equal(validIdentity({ claims: { sub: 'real' }, expires_at: Date.now()/1000-60 }), null);
  assert.equal(validIdentity({ claims: { sub: 'real' }, expires_at: Date.now()/1000+60 }), 'real');
});
test('trip history is limited to its rider and driver', () => {
  const trip = { riderId: 'rider', driverId: 'driver' };
  assert.equal(tripParticipant('stranger', trip), false);
  assert.equal(tripParticipant('rider', trip), true);
  assert.equal(tripParticipant('driver', trip), true);
  assert.equal(tripParticipant('rider', null), false);
});
test('completed, cancelled and unassigned trips do not allow live sharing', () => {
  for (const status of ['completed', 'cancelled', 'requested']) assert.equal(activeTrip({ status }), false);
  for (const status of ['accepted', 'in_progress']) assert.equal(activeTrip({ status }), true);
  assert.equal(activeTrip(null), false);
});
test('revocation, expiry and malformed dates invalidate public tracking links', () => {
  const link = { expiresAt: new Date(Date.now()+60000), revokedAt: null };
  assert.equal(liveLink(link), true);
  assert.equal(liveLink({ ...link, revokedAt: new Date() }), false);
  assert.equal(liveLink({ ...link, expiresAt: new Date(Date.now()-1) }), false);
  assert.equal(liveLink({ ...link, expiresAt: 'bad-date' }), false);
});
