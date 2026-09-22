"use server";

import { contactSchema } from "@/lib/validations";
import { sendContactEnquiryEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";

export interface ContactActionState {
  error?: string;
  success?: boolean;
}

export async function submitContactEnquiry(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details and try again." };
  }

  const captchaToken = String(formData.get("captchaToken") ?? "");
  if (!captchaToken) {
    return { error: "Please complete the captcha." };
  }
  const captchaOk = await verifyTurnstileToken(captchaToken);
  if (!captchaOk) {
    return { error: "Captcha verification failed. Please try again." };
  }

  try {
    await sendContactEnquiryEmail(parsed.data);
  } catch (err) {
    console.error("Failed to send contact enquiry", err);
    return { error: "Could not send your message. Please try again in a moment." };
  }

  return { success: true };
}
