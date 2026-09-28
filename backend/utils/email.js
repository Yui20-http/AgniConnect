const crypto = require('crypto');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  nodemailer = null;
}

const sendMail = async ({ to, subject, text, html }) => {
  if (!to) return { success: false, message: 'Missing recipient email' };

  if (!nodemailer) {
    const demoMessage = `Demo email sent to ${to}\nSubject: ${subject}\n${text}`;
    console.log(demoMessage);
    return { success: true, demo: true, message: demoMessage };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'AgriConnect <noreply@agriconnect.app>',
    to,
    subject,
    text,
    html,
  });
};

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const createToken = () => crypto.randomBytes(32).toString('hex');

module.exports = { sendMail, createOtp, createToken };
