export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_M = 6371000;

const toRadians = (value: number): number => (value * Math.PI) / 180;

export const haversineDistanceM = (
  origin: Coordinates,
  destination: Coordinates
): number => {
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLng = toRadians(destination.longitude - origin.longitude);

  const originLat = toRadians(origin.latitude);
  const destinationLat = toRadians(destination.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
