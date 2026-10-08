import test from "node:test";
import assert from "node:assert/strict";
import { routeParam } from "../server/route-param";
import { measuredTripDistanceKm } from "../server/trip-distance";
import { determineRiderTrustTier, determineDirectorPerformanceTier } from "../server/score-tiers";
import { behaviorSignalTypeEnum, insertDriverProfileSchema, updateDriverProfileSchema } from "../shared/schema";
import { DRIVER_SIGNAL_TYPES, RIDER_SIGNAL_TYPES, SIGNAL_WEIGHTS } from "../shared/trust-config";

test("single identifiers are accepted and wildcard or missing identifiers rejected", () => {
  assert.equal(routeParam({ params: { id: "abc" } }, "id"), "abc");
  for (const id of [undefined, "", ["abc", "def"]]) {
    assert.throws(() => routeParam({ params: { id } } as Parameters<typeof routeParam>[0], "id"), { status: 400 });
  }
});

test("rider loyalty and director performance use their own tiers at boundaries", () => {
  const rider = { platinumThreshold: 90, goldThreshold: 75, standardThreshold: 50 };
  const director = { goldThreshold: 80, silverThreshold: 60, bronzeThreshold: 40 };
  assert.deepEqual([49, 50, 75, 90].map(s => determineRiderTrustTier(s, rider)), ["limited", "standard", "gold", "platinum"]);
  assert.deepEqual([39, 40, 60, 80].map(s => determineDirectorPerformanceTier(s, director)), ["at_risk", "bronze", "silver", "gold"]);
});

test("every configured behavior signal can be persisted; intermediate events do not double reward", () => {
  const supported = new Set<string>(behaviorSignalTypeEnum.enumValues);
  for (const signal of [...DRIVER_SIGNAL_TYPES, ...RIDER_SIGNAL_TYPES]) {
    assert.ok(supported.has(signal), signal);
    assert.ok(Number.isFinite(SIGNAL_WEIGHTS[signal]), signal);
  }
  assert.equal(SIGNAL_WEIGHTS.LOST_ITEM_HUB_DROPOFF, 0);
  assert.equal(SIGNAL_WEIGHTS.DISPUTE_RESOLVED, 0);
});

test("driver onboarding cannot create a profile with missing required vehicle and contact details", () => {
  assert.equal(insertDriverProfileSchema.safeParse({ userId: "driver" }).success, false);
  assert.equal(updateDriverProfileSchema.parse({ vehicleYear: "2020" }).vehicleYear, 2020);
  assert.equal(updateDriverProfileSchema.safeParse({ vehicleYear: "not-a-year" }).success, false);
});

test("trip mileage uses plausible recorded GPS and rejects spoofing, gaps and impossible jumps", () => {
  const point = (longitude: string, seconds: number, isSpoofingDetected = false) => ({
    latitude: "0", longitude, deviceTimestamp: new Date(seconds * 1000), accuracy: "5", isSpoofingDetected,
  });
  const km = measuredTripDistanceKm([point("0", 0), point("0.001", 60)]);
  assert.ok(Math.abs(km - 0.111195) < 0.00001);
  assert.equal(measuredTripDistanceKm([point("0", 0), point("10", 60)]), 0);
  assert.equal(measuredTripDistanceKm([point("0", 0), point("0.001", 180)]), 0);
  assert.equal(measuredTripDistanceKm([point("0", 0), point("0.001", 60, true)]), 0);
  assert.equal(measuredTripDistanceKm([]), 0);
});
