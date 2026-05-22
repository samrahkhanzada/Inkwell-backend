import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

export const passwordResetEmailHtml = (name, url) => `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9fafb;padding:40px;">
  <div style="max-width:500px;margin:auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <h2 style="color:#111">Hi ${name},</h2>
    <p style="color:#444">Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
    <a href="${url}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#e85d04;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
      Reset Password
    </a>
    <p style="color:#999;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body>
</html>`;