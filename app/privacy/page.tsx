import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — PaceVelo",
};

const LAST_UPDATED = "September 22, 2026";
const CONTACT_EMAIL = "me@khaw.cc";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection heading="Overview">
        <p>
          PaceVelo (&quot;PaceVelo&quot;, &quot;we&quot;, &quot;us&quot;) is a workplace platform that lets a
          company&apos;s HR admin run branded running, walking, and cycling challenges for their employees, using
          activity data synced from Strava and/or Google Health. This policy explains what information we collect
          through the PaceVelo service (the &quot;Service&quot;), how we use it, and the choices you have.
        </p>
        <p>
          If you have questions about this policy or want to exercise any of the rights described below, contact
          the PaceVelo owner at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Information we collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">Company &amp; HR admin information</span> — company name,
            URL slug, uploaded logo, an optional Slack webhook URL, and an HR admin&apos;s name, work email, and a
            bcrypt-hashed password. We never store passwords in plain text.
          </li>
          <li>
            <span className="font-medium text-foreground">Employee/participant information</span> — name, email
            address, department, and which company and challenges you&apos;ve joined.
          </li>
          <li>
            <span className="font-medium text-foreground">Strava data</span> — if you connect Strava, we receive
            your Strava athlete ID and OAuth access/refresh tokens, and we sync the activity type, distance, moving
            time, elevation gain, and date of workouts you record on Strava that match a challenge you&apos;ve
            joined. We do not receive your Strava password.
          </li>
          <li>
            <span className="font-medium text-foreground">Google Health data</span> — if you connect Google Health,
            we receive a stable Google account identifier and OAuth access/refresh tokens, and we sync your daily
            step counts. We do not receive your Google password.
          </li>
          <li>
            <span className="font-medium text-foreground">Login &amp; session data</span> — we record the fact and
            time of each sign-in (to power basic usage stats for HR admins and our own support/back-office tooling)
            and issue an httpOnly session cookie to keep you signed in. We do not use third-party analytics or
            advertising trackers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="How we use information">
        <p>We use the information above to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Operate challenge leaderboards and match synced activity/step data to the right challenges;</li>
          <li>Authenticate you and maintain your session;</li>
          <li>Verify company membership (e.g. matching your email domain to your employer&apos;s challenge);</li>
          <li>Send one-time verification codes to confirm your email when you join a challenge;</li>
          <li>Prevent duplicate or fraudulent accounts (e.g. one Strava or Google account can&apos;t be linked to two PaceVelo profiles at once);</li>
          <li>Provide customer support and troubleshoot the Service.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Who can see your data">
        <p>
          Leaderboard standings (name, department, and your challenge metric — e.g. total distance or steps) are
          visible to everyone at your company via your company&apos;s leaderboard page, since that&apos;s the core
          purpose of the Service. Your HR admin and PaceVelo&apos;s own back-office support staff can see your
          account details (name, email, department, connection status) to help run and support your company&apos;s
          challenges.
        </p>
        <p>We do not sell your personal information. We share information only with:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">Strava</span> and{" "}
            <span className="font-medium text-foreground">Google</span> — to authenticate you and fetch the activity
            or step data you&apos;ve authorized us to access;
          </li>
          <li>
            <span className="font-medium text-foreground">Neon</span> (database hosting) and{" "}
            <span className="font-medium text-foreground">Vercel</span> (application hosting and file storage) — to
            run the Service;
          </li>
          <li>
            <span className="font-medium text-foreground">Resend</span> — to deliver the email verification codes we
            send when you join a challenge;
          </li>
          <li>Where required by law, or to protect the rights, safety, or property of PaceVelo, our users, or others.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Data retention &amp; deletion">
        <p>
          We retain your information for as long as your account and your company&apos;s access to PaceVelo remain
          active. You can disconnect Strava or Google Health at any time from your dashboard, which revokes our
          access and stops further syncing (previously synced activity/step data is not automatically deleted). If
          you revoke PaceVelo&apos;s access from within Strava, we are notified and remove your stored Strava
          credentials. We also automatically disconnect Strava accounts that haven&apos;t been part of any challenge
          for about 7 days; you can reconnect at any time. When a workout is deleted on Strava, or made private
          there, we remove it from our records as well.
        </p>
        <p>
          To delete your account entirely, ask your company&apos;s HR admin or email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          — deleting a profile removes your account, synced activity/step history, and challenge participation
          records.
        </p>
      </LegalSection>

      <LegalSection heading="Your choices">
        <ul className="list-disc space-y-1 pl-5">
          <li>Disconnect Strava and/or Google Health at any time from your employee dashboard.</li>
          <li>Sign out at any time; sessions also expire automatically.</li>
          <li>Request access to, correction of, or deletion of your data by contacting us at the email above.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          We use industry-standard practices to protect your information, including encrypted connections (HTTPS)
          between your browser and our servers, bcrypt password hashing, and httpOnly session cookies that
          aren&apos;t accessible to client-side scripts. No method of transmission or storage is 100% secure, and we
          can&apos;t guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection heading="Children's privacy">
        <p>
          PaceVelo is a workplace product intended for use by employees of participating companies and is not
          directed at children. We do not knowingly collect information from anyone under 16.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy from time to time. If we make material changes, we&apos;ll update the &quot;Last
          updated&quot; date above. Continued use of the Service after a change constitutes acceptance of the
          updated policy.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          Questions about this policy or your data? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
