const { geocodeLocation } = require('./geo');

const DELIVERY_BASE_FEE = 20;
const DELIVERY_RATE_PER_KM = 5;
const ROAD_DISTANCE_FACTOR = 1.25;
const UNKNOWN_DISTANCE_KM = 10;

const haversineKm = (from, to) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const validCoordinates = (coordinates) =>
  coordinates && Number.isFinite(Number(coordinates.lat)) && Number.isFinite(Number(coordinates.lng)) &&
  coordinates.lat != null && coordinates.lng != null;

const estimateDelivery = ({ pickupCoordinates, deliveryCoordinates, pickupLocation, deliveryLocation }) => {
  const pickup = validCoordinates(pickupCoordinates) ? pickupCoordinates : geocodeLocation(pickupLocation);
  const drop = validCoordinates(deliveryCoordinates) ? deliveryCoordinates : geocodeLocation(deliveryLocation);
  const approximateDistanceKm = pickup && drop
    ? Math.max(1, haversineKm(pickup, drop) * ROAD_DISTANCE_FACTOR)
    : UNKNOWN_DISTANCE_KM;
  const distanceKm = Number(approximateDistanceKm.toFixed(1));
  const deliveryFee = Number((DELIVERY_BASE_FEE + Math.ceil(distanceKm) * DELIVERY_RATE_PER_KM).toFixed(2));

  return {
    distanceKm,
    deliveryFee,
    isApproximate: true,
    baseFee: DELIVERY_BASE_FEE,
    ratePerKm: DELIVERY_RATE_PER_KM,
  };
};

module.exports = { DELIVERY_BASE_FEE, DELIVERY_RATE_PER_KM, estimateDelivery, haversineKm };
