/**
 * Calculates the great-circle distance between two points on Earth
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lon1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lon2 - Longitude of point 2 (degrees)
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000; // Earth's mean radius in meters

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Checks whether a user's GPS coordinates fall within a shop's geofence.
 *
 * @param userLat - User latitude (degrees)
 * @param userLon - User longitude (degrees)
 * @param shopLon - Shop longitude (from MongoDB GeoJSON: coordinates[0])
 * @param shopLat - Shop latitude (from MongoDB GeoJSON: coordinates[1])
 * @param radiusMeters - Allowed radius in meters
 * @returns Object with `allowed` boolean and actual `distance` in meters
 */
export function checkGeoFence(
  userLat: number,
  userLon: number,
  shopLon: number,
  shopLat: number,
  radiusMeters: number,
): { allowed: boolean; distance: number } {
  const distance = haversineDistance(userLat, userLon, shopLat, shopLon);
  return {
    allowed: distance <= radiusMeters,
    distance: Math.round(distance),
  };
}
