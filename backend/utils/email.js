const crypto = require('crypto');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  nodemailer = null;
}

const sendMail = async ({ to, subject, text, html }) => {
  if (!to) return { success: false, message: 'Missing recipient email' };

  if (!nodemailer || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const reason = !nodemailer
      ? 'Nodemailer is not installed on the backend.'
      : 'SMTP_USER and SMTP_PASS are not configured in backend/.env.';
    console.warn(`Email not sent to ${to}: ${reason}`);
    return { success: false, configured: false, message: reason };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter.sendMail({
    from: process.env.SMTP_FROM || `AgriConnect <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const createToken = () => crypto.randomBytes(32).toString('hex');

module.exports = { sendMail, createOtp, createToken };
