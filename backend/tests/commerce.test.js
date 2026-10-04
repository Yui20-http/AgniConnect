const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTieredUnitPrice, calculatePayoutBreakdown, groupCartItemsByFarmer, calculateCartTotals } = require('../utils/commerce');
const { verifyRazorpaySignature } = require('../utils/razorpaySignature');
const { estimateDelivery } = require('../utils/deliveryPricing');

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

test('groupCartItemsByFarmer creates separate cart groups per farmer', () => {
  const groups = groupCartItemsByFarmer([
    { product: { farmer: 'farmer-a' }, quantity: 2 },
    { product: { farmer: 'farmer-b' }, quantity: 1 },
    { product: { farmer: { _id: 'farmer-a' } }, quantity: 3 },
    { product: null, quantity: 4 },
  ]);

  assert.deepEqual(Object.keys(groups).sort(), ['farmer-a', 'farmer-b']);
  assert.equal(groups['farmer-a'].length, 2);
  assert.equal(groups['farmer-b'].length, 1);
});

test('calculateCartTotals charges tier price and estimates delivery per farmer route', () => {
  const quote = calculateCartTotals([
    { product: { farmer: { _id: 'farmer-a', farmLocation: 'Pune, Maharashtra' }, pricePerUnit: 100, bulkPricing: [{ minQty: 10, pricePerUnit: 80 }] }, quantity: 10 },
    { product: { farmer: { _id: 'farmer-b', farmLocation: 'Nashik, Maharashtra' }, pricePerUnit: 50, bulkPricing: [] }, quantity: 2 },
  ], 'Mumbai, Maharashtra');
  assert.equal(quote.subtotal, 900);
  assert.equal(quote.deliveryFee, quote.deliveryByFarmer['farmer-a'].deliveryFee + quote.deliveryByFarmer['farmer-b'].deliveryFee);
  assert.ok(quote.deliveryByFarmer['farmer-a'].distanceKm > 0);
  assert.ok(quote.deliveryByFarmer['farmer-a'].deliveryFee > 20);
  assert.equal(quote.total, quote.subtotal + quote.deliveryFee);
});

test('verifyRazorpaySignature accepts a valid HMAC and rejects a tampered signature', () => {
  const crypto = require('crypto');
  const key = 'test-secret';
  const expected = crypto.createHmac('sha256', key).update('order_123|pay_456').digest('hex');
  assert.equal(verifyRazorpaySignature('order_123', 'pay_456', expected, key), true);
  assert.equal(verifyRazorpaySignature('order_123', 'pay_456', `${expected.slice(0, -1)}0`, key), false);
});

test('delivery pricing increases with route distance instead of applying a flat fee', () => {
  const nearby = estimateDelivery({ pickupLocation: 'Pune', deliveryLocation: 'Pune' });
  const farther = estimateDelivery({ pickupLocation: 'Pune', deliveryLocation: 'Mumbai' });
  assert.ok(farther.distanceKm > nearby.distanceKm);
  assert.ok(farther.deliveryFee > nearby.deliveryFee);
  assert.equal(nearby.deliveryFee, 25);
});
