import "server-only";

import { Resend } from "resend";

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
