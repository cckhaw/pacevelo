import "server-only";

import { Resend } from "resend";

const CONTACT_INBOX = "me@khaw.cc";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function client() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY env var");
  }
  return new Resend(apiKey);
}

// resend.dev's shared sandbox address only delivers to the Resend account
// owner's own inbox - verify a domain and set RESEND_FROM_EMAIL for real use.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "PaceVelo <onboarding@resend.dev>";

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const resend = client();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `${code} is your PaceVelo verification code`,
    text: `Your PaceVelo verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 420px; margin: 0 auto;">
        <p>Your PaceVelo verification code is:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${code}</p>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const resend = client();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your PaceVelo password",
    text: `We received a request to reset your PaceVelo password. Reset it here: ${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 420px; margin: 0 auto;">
        <p>We received a request to reset your PaceVelo password.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #0B1220; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none;">Reset password</a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

export interface ContactEnquiry {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/** Sends a public contact-form enquiry to PaceVelo's own inbox, with reply-to set to the sender so it can be answered directly. */
export async function sendContactEnquiryEmail(enquiry: ContactEnquiry): Promise<void> {
  const resend = client();

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: CONTACT_INBOX,
    replyTo: enquiry.email,
    subject: `New PaceVelo enquiry from ${enquiry.name}`,
    text: `Name: ${enquiry.name}\nEmail: ${enquiry.email}\nPhone: ${enquiry.phone}\n\n${enquiry.message}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
        <p><strong>Name:</strong> ${escapeHtml(enquiry.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(enquiry.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(enquiry.phone)}</p>
        <p style="white-space: pre-wrap;">${escapeHtml(enquiry.message)}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send contact enquiry email: ${error.message}`);
  }
}
