import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendEmailVerificationOtp = async ({ email, otp }) =>
  transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Verify your Unslouch email",
    text: `Your Unslouch verification code is ${otp}. It expires in 10 minutes.`,
    html: `
      <p>Your Unslouch verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">
        ${otp}
      </p>
      <p>This code expires in 10 minutes.</p>
    `,
  });

export const sendPasswordResetLink = async ({ email, resetUrl }) =>
  transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Reset your Unslouch password",
    text: `Open this link to reset your Unslouch password: ${resetUrl}. This link expires in 30 minutes.`,
    html: `
      <p>A password reset was requested for your Unslouch account.</p>
      <p>
        <a href="${resetUrl}">Reset password</a>
      </p>
      <p>This link expires in 30 minutes and can only be used once.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });