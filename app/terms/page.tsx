import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Terms of Service — PaceVelo",
};

const LAST_UPDATED = "September 22, 2026";
const CONTACT_EMAIL = "me@khaw.cc";

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection heading="Agreement to these terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of PaceVelo (the
          &quot;Service&quot;), operated by the individual reachable at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          (&quot;PaceVelo&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account, setting up a company, or
          joining a challenge, you agree to these Terms. If you don&apos;t agree, don&apos;t use the Service.
        </p>
      </LegalSection>

      <LegalSection heading="What PaceVelo is">
        <p>
          PaceVelo lets an HR admin set up branded running, walking, and cycling challenges for their company and
          invite employees to join via a link. Once joined, employees connect Strava and/or Google Health, and their
          synced activity or step data powers live individual and departmental leaderboards for that company.
        </p>
      </LegalSection>

      <LegalSection heading="Accounts">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">HR admins</span> create an account with an email and
            password to set up and manage their company&apos;s challenges. You&apos;re responsible for keeping your
            password confidential and for all activity under your account.
          </li>
          <li>
            <span className="font-medium text-foreground">Employees/participants</span> join a specific company
            through that company&apos;s invite link, verify their email, and connect the data source (Strava or
            Google Health) the challenge requires.
          </li>
          <li>You must provide accurate information and keep it up to date.</li>
          <li>You&apos;re responsible for complying with your own employer&apos;s policies on using workplace tools like PaceVelo.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use the Service for any unlawful purpose or in violation of any applicable law or regulation;</li>
          <li>Impersonate another person or misrepresent your affiliation with a company;</li>
          <li>Attempt to manipulate leaderboard standings through fraudulent or falsified activity data;</li>
          <li>Interfere with, disrupt, or attempt to gain unauthorized access to the Service or its underlying systems;</li>
          <li>Use the Service to harass, abuse, or harm another person.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Third-party services">
        <p>
          The Service integrates with Strava and Google Health to sync your fitness activity and step data. Your use
          of those third-party services is governed by their own terms and privacy policies, and PaceVelo is not
          responsible for their availability, accuracy, or conduct. You can disconnect either integration at any
          time from your dashboard.
        </p>
      </LegalSection>

      <LegalSection heading="Fitness data disclaimer">
        <p>
          Activity, distance, time, elevation, and step data shown in PaceVelo is reported as-is from Strava and/or
          Google Health and is not independently verified for accuracy. PaceVelo is a workplace engagement tool, not
          a medical or fitness-coaching product, and nothing on the Service constitutes medical advice. Consult a
          qualified professional before starting any exercise program, and participate in challenges at your own
          risk.
        </p>
      </LegalSection>

      <LegalSection heading="Company &amp; HR admin content">
        <p>
          HR admins are responsible for the accuracy of the company information, challenge details, and any logo
          they upload, and for having the rights to any content they upload. We may remove content that violates
          these Terms.
        </p>
      </LegalSection>

      <LegalSection heading="Intellectual property">
        <p>
          The Service, including its design, branding, and underlying software, is owned by PaceVelo and protected
          by applicable intellectual property laws. These Terms don&apos;t grant you any rights to PaceVelo&apos;s
          trademarks or branding beyond what&apos;s needed to use the Service as intended.
        </p>
      </LegalSection>

      <LegalSection heading="Termination">
        <p>
          You may stop using the Service and request account deletion at any time (see the{" "}
          <a href="/privacy" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </a>{" "}
          for how). We may suspend or terminate access to the Service, for a company or an individual account, if we
          reasonably believe these Terms have been violated, or to protect the Service or its users.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimer of warranties">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind,
          whether express or implied, including implied warranties of merchantability, fitness for a particular
          purpose, and non-infringement. We don&apos;t warrant that the Service will be uninterrupted, error-free,
          or that synced data will always be complete or accurate.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, PaceVelo and its operator will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss of data, revenue, or goodwill,
          arising out of or related to your use of the Service, even if advised of the possibility of such damages.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to these terms">
        <p>
          We may update these Terms from time to time. If we make material changes, we&apos;ll update the &quot;Last
          updated&quot; date above. Continued use of the Service after a change constitutes acceptance of the
          updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          Questions about these Terms? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
