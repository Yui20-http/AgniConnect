/**
 * Very small offline geocoder.
 *
 * The project intentionally avoids paid geocoding APIs, so we map the
 * Maharashtra cities used by the demo data to approximate coordinates.
 * This lets the Leaflet tracking map render a pickup -> delivery route
 * without any external service.
 */

const CITY_COORDS = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  pune: { lat: 18.5204, lng: 73.8567 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  kolhapur: { lat: 16.705, lng: 74.2433 },
  aurangabad: { lat: 19.8762, lng: 75.3433 },
  thane: { lat: 19.2183, lng: 72.9781 },
  solapur: { lat: 17.6599, lng: 75.9064 },
  amravati: { lat: 20.9374, lng: 77.7796 },
  satara: { lat: 17.6805, lng: 74.0183 },
  sangli: { lat: 16.8524, lng: 74.5815 },
  jalgaon: { lat: 21.0077, lng: 75.5626 },
  ahmednagar: { lat: 19.0948, lng: 74.748 },
  latur: { lat: 18.4088, lng: 76.5604 },
  akola: { lat: 20.7002, lng: 77.0082 },
  delhi: { lat: 28.6139, lng: 77.209 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  surat: { lat: 21.1702, lng: 72.8311 },
  indore: { lat: 22.7196, lng: 75.8577 },
};

/**
 * Try to resolve a free-text location string to coordinates.
 * Returns { lat, lng } or null when nothing matches.
 */
const geocodeLocation = (text) => {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  for (const city of Object.keys(CITY_COORDS)) {
    if (lower.includes(city)) return CITY_COORDS[city];
  }
  return null;
};

module.exports = { geocodeLocation, CITY_COORDS };
