const MSG91_FLOW_URL = 'https://control.msg91.com/api/v5/flow';

const isMsg91Configured = () => Boolean(
  process.env.MSG91_AUTH_KEY && process.env.MSG91_DELIVERY_OTP_TEMPLATE_ID
);

const toIndianMobile = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return '';
};

const sendDeliveryOtpSms = async ({ phone, otp, orderNumber }) => {
  if (!isMsg91Configured()) return { configured: false, sent: false };

  const mobile = toIndianMobile(phone);
  if (!mobile) return { configured: true, sent: false, reason: 'invalid_phone' };

  try {
    const response = await fetch(MSG91_FLOW_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authkey: process.env.MSG91_AUTH_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_DELIVERY_OTP_TEMPLATE_ID,
        short_url: '0',
        recipients: [{ mobiles: mobile, VAR1: String(otp), VAR2: String(orderNumber || '') }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || result?.type === 'error' || result?.status === 'error') {
      console.error(`Delivery OTP SMS provider returned HTTP ${response.status}`);
      return { configured: true, sent: false, reason: 'provider_error' };
    }
    return { configured: true, sent: true };
  } catch (error) {
    console.error(`Delivery OTP SMS request failed: ${error.message}`);
    return { configured: true, sent: false, reason: 'provider_error' };
  }
};

module.exports = { sendDeliveryOtpSms, isMsg91Configured };
