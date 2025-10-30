import { config as loadEnv } from 'dotenv';
import nodemailer from 'nodemailer';

loadEnv();

const host = process.env.MAIL_HOST;
const port = Number(process.env.MAIL_PORT ?? '587');
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASSWORD;
const from = process.env.MAIL_FROM ?? 'no-reply@kryptovault.com';

if (!host) {
  console.error('MAIL_HOST is not configured. Update your environment variables before running this script.');
  process.exit(1);
}

(async () => {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  try {
    await transporter.verify();
    console.log(`✅ SMTP connectivity verified for ${host}:${port}.`);
  } catch (error) {
    console.error('❌ Unable to verify SMTP credentials:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const recipient = process.env.MAIL_TEST_RECIPIENT;
  if (!recipient) {
    console.log('Set MAIL_TEST_RECIPIENT to send a test message. Skipping send step.');
    process.exit(0);
  }

  const subject = process.env.MAIL_TEST_SUBJECT ?? 'KryptoVault SMTP connectivity test';
  const text =
    process.env.MAIL_TEST_BODY ??
    `This is a connectivity test from KryptoVault. If you received this email, SMTP is configured correctly.\n\nTimestamp: ${
      new Date().toISOString()
    }`;

  try {
    await transporter.sendMail({
      from,
      to: recipient,
      subject,
      text,
    });
    console.log(`📬 Test email successfully sent to ${recipient}.`);
  } catch (error) {
    console.error('❌ Unable to send test email:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
