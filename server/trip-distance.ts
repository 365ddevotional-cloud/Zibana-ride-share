type Point = { latitude: string; longitude: string; deviceTimestamp: Date; isSpoofingDetected: boolean; accuracy: string | null };

/** Measured GPS mileage only. Never substitute an invented estimate for a tax record. */
export function measuredTripDistanceKm(points: Point[]): number {
  const radians = (n: number) => n * Math.PI / 180;
  let distance = 0;
  let previous: { lat: number; lng: number; time: number } | undefined;
  for (const point of points) {
    const lat = Number(point.latitude), lng = Number(point.longitude);
    const time = point.deviceTimestamp.getTime();
    if (point.isSpoofingDetected || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(time) ||
        (point.accuracy !== null && Number(point.accuracy) > 100)) {
      previous = undefined;
      continue;
    }
    if (previous) {
      const elapsed = (time - previous.time) / 1000;
      if (elapsed <= 0) continue;
      const a = Math.sin(radians(lat - previous.lat) / 2) ** 2 +
        Math.cos(radians(previous.lat)) * Math.cos(radians(lat)) * Math.sin(radians(lng - previous.lng) / 2) ** 2;
      const segment = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
      // Do not bridge missing telemetry or record impossible movement.
      if (elapsed <= 120 && segment / elapsed * 3600 <= 180) distance += segment;
    }
    previous = { lat, lng, time };
  }
  return distance;
}
