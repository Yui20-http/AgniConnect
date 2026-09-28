const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTieredUnitPrice, calculatePayoutBreakdown } = require('../utils/commerce');

test('calculateTieredUnitPrice picks the best bulk quantity tier', () => {
  const product = {
    pricePerUnit: 100,
    bulkPricing: [
      { minQty: 10, pricePerUnit: 90 },
      { minQty: 25, pricePerUnit: 80 },
    ],
  };

  assert.equal(calculateTieredUnitPrice(product, 30), 80);
  assert.equal(calculateTieredUnitPrice(product, 5), 100);
});

test('calculatePayoutBreakdown applies platform commission correctly', () => {
  const breakdown = calculatePayoutBreakdown(1500, 6);
  assert.equal(breakdown.farmerPayout, 1410);
  assert.equal(breakdown.platformCommission, 90);
});
