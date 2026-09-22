import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/contact-form";
import { LogoInline } from "@/components/logo";

export const metadata = {
  title: "Contact Us — PaceVelo",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <header className="flex items-center px-4 py-4 sm:px-6">
        <Link href="/">
          <LogoInline markSize={32} />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-xl">Contact PaceVelo</CardTitle>
            <CardDescription>
              Got a question, or want to get your company set up? Send us a message and we&apos;ll get back to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContactForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
