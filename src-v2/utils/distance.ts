export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates in kilometers
 * Using Haversine formula
 */
export const calculateDistance = (
  coord1: Coordinates,
  coord2: Coordinates,
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(coord2.latitude - coord1.latitude);
  const dLon = deg2rad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.latitude)) *
      Math.cos(deg2rad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Format distance for display
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else {
    return `${distance.toFixed(1)}km`;
  }
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};
