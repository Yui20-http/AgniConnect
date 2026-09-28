const DEFAULT_PLATFORM_COMMISSION_RATE = 6;

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

module.exports = {
  DEFAULT_PLATFORM_COMMISSION_RATE,
  calculateTieredUnitPrice,
  calculatePayoutBreakdown,
};
