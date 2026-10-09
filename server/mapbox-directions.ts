import type { MappingBudget } from './mapping-usage-ledger';
type Ledger = ReturnType<typeof import('./mapping-usage-ledger').createMappingUsageLedger>;
export function mappingBudgetFromEnv(): MappingBudget {
  const integer = (key: string) => {
    const value = process.env[key];
    if (!value || !/^\d+$/.test(value)) throw new Error(`Configure ${key}`);
    return Number(value);
  };
  return { periodStart: process.env.MAPBOX_PERIOD_START || '', periodEnd: process.env.MAPBOX_PERIOD_END || '',
    startingRequests: integer('MAPBOX_PERIOD_STARTING_REQUESTS'), maxRequests: integer('MAPBOX_MAX_REQUESTS'),
    maxCostMicroUsd: integer('MAPBOX_MAX_COST_MICROUSD') };
}
export async function previewDirections(ledger: Ledger, actorId: string, requestKey: string, coordinates: unknown) {
  if (process.env.MAPBOX_DIRECTIONS_ENABLED !== 'true' || !process.env.MAPBOX_ACCESS_TOKEN) throw new Error('Mapbox is not configured');
  if (!Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(p => Array.isArray(p) && p.length === 2 &&
    p.every(v => typeof v === 'number' && Number.isFinite(v)) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) throw new Error('Two valid longitude/latitude points are required');
  const attempt = await ledger.reserve(actorId,requestKey,mappingBudgetFromEnv());
  try {
    const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.map(p => p.join(',')).join(';')}`);
    url.searchParams.set('access_token',process.env.MAPBOX_ACCESS_TOKEN);
    url.searchParams.set('geometries','geojson'); url.searchParams.set('overview','full');
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'error' });
    const data = await response.json(); const route = data.routes?.[0];
    if (!response.ok || data.code !== 'Ok' || !Number.isFinite(route?.distance) || route.distance < 0 ||
      !Number.isFinite(route?.duration) || route.duration < 0 || route.geometry?.type !== 'LineString' ||
      !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2 ||
      !route.geometry.coordinates.every((p: unknown) => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && Number.isFinite(p[0]) && Math.abs(p[0]) <= 180 && typeof p[1] === 'number' && Number.isFinite(p[1]) && Math.abs(p[1]) <= 90)) throw new Error('No verified driving route returned');
    await ledger.finish(attempt.id,true);
    return { distanceMetres: route.distance, durationSeconds: route.duration, geometry: route.geometry,
      usage: attempt, bookingEnabled: false, notice: 'Admin driving-route preview only; not Keke route approval or a chargeable fare quote.' };
  } catch(e) { await ledger.finish(attempt.id,false); throw new Error('Route preview failed; usage attempt retained for reconciliation'); }
}
