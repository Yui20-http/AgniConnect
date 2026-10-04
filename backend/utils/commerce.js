const DEFAULT_PLATFORM_COMMISSION_RATE = 6;
const { estimateDelivery } = require('./deliveryPricing');

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateTieredUnitPrice = (product, quantity = 1) => {
  const basePrice = normalizeNumber(product?.pricePerUnit, 0);
  const requestedQty = Math.max(1, normalizeNumber(quantity, 1));

  if (!Array.isArray(product?.bulkPricing) || product.bulkPricing.length === 0) {
    return Number(basePrice.toFixed(2));
  }

  const tiers = [...product.bulkPricing]
    .map((tier) => ({
      minQty: Math.max(1, normalizeNumber(tier?.minQty, 1)),
      pricePerUnit: normalizeNumber(tier?.pricePerUnit, basePrice),
    }))
    .sort((a, b) => a.minQty - b.minQty);

  let selectedPrice = basePrice;
  for (const tier of tiers) {
    if (requestedQty >= tier.minQty && tier.pricePerUnit < selectedPrice) {
      selectedPrice = tier.pricePerUnit;
    }
  }

  return Number(selectedPrice.toFixed(2));
};

const calculatePayoutBreakdown = (grossAmount, commissionRatePercent = DEFAULT_PLATFORM_COMMISSION_RATE) => {
  const gross = normalizeNumber(grossAmount, 0);
  const rate = normalizeNumber(commissionRatePercent, DEFAULT_PLATFORM_COMMISSION_RATE);
  const platformCommission = Number(((gross * rate) / 100).toFixed(2));
  const farmerPayout = Number((gross - platformCommission).toFixed(2));

  return {
    grossAmount: gross,
    platformCommission,
    farmerPayout,
    commissionRatePercent: rate,
  };
};

const groupCartItemsByFarmer = (items = []) => items.reduce((groups, item) => {
  if (!item?.product) return groups;
  const farmer = item.product.farmer;
  const farmerId = String(farmer?._id || farmer || '');
  if (!farmerId) return groups;
  if (!groups[farmerId]) groups[farmerId] = [];
  groups[farmerId].push(item);
  return groups;
}, {});

const calculateCartTotals = (items = [], deliveryLocation = '') => {
  const groups = groupCartItemsByFarmer(items);
  const lines = [];
  const deliveryByFarmer = {};
  let subtotal = 0;

  for (const [farmerId, farmerItems] of Object.entries(groups)) {
    const firstProduct = farmerItems[0]?.product;
    const farmer = firstProduct?.farmer && typeof firstProduct.farmer === 'object' ? firstProduct.farmer : {};
    const pickupLocation = farmer.farmLocation || farmer.location || firstProduct?.location || '';
    const delivery = estimateDelivery({
      pickupCoordinates: firstProduct?.coordinates,
      deliveryCoordinates: null,
      pickupLocation,
      deliveryLocation,
    });
    deliveryByFarmer[farmerId] = delivery;
    for (const item of farmerItems) {
      const unitPrice = calculateTieredUnitPrice(item.product, item.quantity);
      const lineTotal = Number((unitPrice * Number(item.quantity || 0)).toFixed(2));
      subtotal += lineTotal;
      lines.push({ farmerId, item, unitPrice, lineTotal });
    }
  }

  subtotal = Number(subtotal.toFixed(2));
  const deliveryFee = Number(Object.values(deliveryByFarmer).reduce((sum, delivery) => sum + delivery.deliveryFee, 0).toFixed(2));
  return {
    groups,
    lines,
    deliveryByFarmer,
    subtotal,
    deliveryFee,
    total: Number((subtotal + deliveryFee).toFixed(2)),
  };
};

module.exports = {
  DEFAULT_PLATFORM_COMMISSION_RATE,
  calculateTieredUnitPrice,
  calculatePayoutBreakdown,
  groupCartItemsByFarmer,
  calculateCartTotals,
};
