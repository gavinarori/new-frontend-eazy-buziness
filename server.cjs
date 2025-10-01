/* Minimal email API server using Mailtrap SMTP via Nodemailer (CommonJS) */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MAILTRAP_HOST = process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io';
const MAILTRAP_PORT = Number(process.env.MAILTRAP_PORT || 2525);
const MAILTRAP_USER = process.env.MAILTRAP_USER;
const MAILTRAP_PASS = process.env.MAILTRAP_PASS;
const FROM_EMAIL = process.env.MAILTRAP_FROM_EMAIL || 'no-reply@example.com';
const FROM_NAME = process.env.MAILTRAP_FROM_NAME || 'EasyBizness';

const transporter = nodemailer.createTransport({
  host: MAILTRAP_HOST,
  port: MAILTRAP_PORT,
  auth: {
    user: MAILTRAP_USER,
    pass: MAILTRAP_PASS,
  },
});

app.post('/api/send-approval', async (req, res) => {
  try {
    const { toEmail, toName, shopName } = req.body || {};
    if (!toEmail || !shopName) {
      return res.status(400).json({ error: 'toEmail and shopName are required' });
    }
    const subject = `Your business "${shopName}" has been approved`;
    const dashboardUrl = `${req.protocol}://${req.get('host')}/dashboard`;
    const greetingName = (toName && toName.trim().length > 0) ? toName : 'there';

    const html = `
      <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.6;">
        <div style="max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(90deg,#2563eb,#4f46e5); padding: 20px; color: #fff;">
            <h1 style="margin: 0; font-size: 20px;">EasyBizness</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 12px 0;">Hi ${greetingName},</p>
            <p style="margin: 0 0 12px 0;">Your business <strong>${shopName}</strong> has been approved and is now active.</p>
            <p style="margin: 0 0 16px 0;">Visit your dashboard to start managing your business.</p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
            </div>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">Approved on ${new Date().toLocaleString()}</p>
          </div>
        </div>
        <p style="margin-top: 16px; font-size: 12px; color: #6b7280; text-align: center;">This is an automated message. Please do not reply.</p>
      </div>
    `;

    const text = `Hi ${greetingName},\n\nYour business "${shopName}" has been approved and is now active.\nVisit your dashboard: ${dashboardUrl}\nApproved on ${new Date().toLocaleString()}`;

    await transporter.sendMail({
      from: { address: FROM_EMAIL, name: FROM_NAME },
      to: [{ address: toEmail, name: toName || '' }],
      subject,
      text,
      html,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('send-approval error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

const port = Number(process.env.PORT || 5174);
app.listen(port, () => {
  console.log(`Email API listening on http://localhost:${port}`);
});


