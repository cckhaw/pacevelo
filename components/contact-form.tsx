"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget, type TurnstileHandle } from "@/components/turnstile-widget";
import { submitContactEnquiry, type ContactActionState } from "@/app/contact/actions";
import { COUNTRY_CALLING_CODES } from "@/lib/countries";

const initialState: ContactActionState = {};

// Client-side gate for fast feedback only - lib/validations.ts#contactSchema
// (via emailSchema) is the actual source of truth, re-checked server-side.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactEnquiry, initialState);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneCountryName, setPhoneCountryName] = useState(COUNTRY_CALLING_CODES[0].name);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);

  const dialCode = COUNTRY_CALLING_CODES.find((c) => c.name === phoneCountryName)?.dialCode ?? "";
  const combinedPhone = `${dialCode} ${phoneNumber.trim()}`.trim();

  // A Turnstile token is single-use - Cloudflare invalidates it once
  // submitted for verification, whether or not that verification (or the
  // rest of the submission) succeeded. Clearing the stale token is pure
  // state, adjusted during render (per React's "adjust state when a prop
  // changes" pattern) rather than an effect; comparing the whole state
  // object (not just .error) since useActionState returns a fresh object
  // on every completion. Resetting the widget itself is a genuine
  // external-system side effect, so that part stays in a real effect.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.error) setCaptchaToken(null);
  }

  useEffect(() => {
    if (state.error) turnstileRef.current?.reset();
  }, [state]);

  if (state.success) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> Thanks for reaching out! We&apos;ll get back to you soon.
      </p>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    let hasError = false;

    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError("Enter a valid email address");
      hasError = true;
    }
    if (!message.trim()) {
      setMessageError("Enter a message");
      hasError = true;
    }

    if (hasError) e.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="captchaToken" value={captchaToken ?? ""} />
      <input type="hidden" name="phone" value={combinedPhone} />
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(null);
          }}
          aria-invalid={emailError ? true : undefined}
        />
        {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone number</Label>
        <div className="flex gap-2">
          <select
            aria-label="Country code"
            value={phoneCountryName}
            onChange={(e) => setPhoneCountryName(e.target.value)}
            className="h-10 w-40 shrink-0 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {COUNTRY_CALLING_CODES.map((country) => (
              <option key={country.name} value={country.name}>
                {country.name} ({country.dialCode})
              </option>
            ))}
          </select>
          <Input
            id="phoneNumber"
            type="tel"
            required
            autoComplete="tel-national"
            placeholder="12-345 6789"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="How can we help?"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setMessageError(null);
          }}
          aria-invalid={messageError ? true : undefined}
        />
        {messageError ? <p className="text-sm text-destructive">{messageError}</p> : null}
      </div>
      <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton size="lg" className="w-full">
        Send message
      </SubmitButton>
    </form>
  );
}
