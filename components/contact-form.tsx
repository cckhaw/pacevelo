"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget, type TurnstileHandle } from "@/components/turnstile-widget";
import { submitContactEnquiry, type ContactActionState } from "@/app/contact/actions";

const initialState: ContactActionState = {};

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactEnquiry, initialState);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

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

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="captchaToken" value={captchaToken ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" name="phone" type="tel" required autoComplete="tel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required rows={5} placeholder="How can we help?" />
      </div>
      <TurnstileWidget ref={turnstileRef} onToken={setCaptchaToken} />
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton size="lg" className="w-full">
        Send message
      </SubmitButton>
    </form>
  );
}
