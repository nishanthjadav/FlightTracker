/**
 * Coarse continent classification from lat/lng. Good enough for filtering
 * "show me planes over Europe" / "show me planes over Asia" — uses rectangular
 * bounding boxes rather than precise polygons.
 */
export function regionFromCoords(lat: number, lng: number): string | null {
  if (!isFinite(lat) || !isFinite(lng)) return null;

  // Europe
  if (lat >= 35 && lat <= 71 && lng >= -25 && lng <= 45) return "Europe";
  // Africa
  if (lat >= -35 && lat < 35 && lng >= -20 && lng <= 52) return "Africa";
  // Middle East (between Africa and Asia)
  if (lat >= 12 && lat <= 42 && lng >= 35 && lng <= 65) return "Middle East";
  // Asia
  if (lat >= -10 && lat <= 75 && lng > 65 && lng <= 150) return "Asia";
  // Oceania
  if (lat >= -50 && lat < -10 && lng >= 110 && lng <= 180) return "Oceania";
  if (lat >= -50 && lat < -10 && lng >= -180 && lng <= -130) return "Oceania";
  // North America
  if (lat >= 15 && lat <= 84 && lng >= -170 && lng <= -50) return "North America";
  // Central America / Caribbean
  if (lat >= 7 && lat < 30 && lng >= -120 && lng <= -60) return "Central America";
  // South America
  if (lat >= -56 && lat < 15 && lng >= -82 && lng <= -34) return "South America";
  // Antarctica
  if (lat < -60) return "Antarctica";

  return null;
}
