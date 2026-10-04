const crypto = require('crypto');

const verifyRazorpaySignature = (orderId, paymentId, signature, secret) => {
  if (!orderId || !paymentId || !signature || !secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(expected, received);
};

module.exports = { verifyRazorpaySignature };