import React from 'react';
import LegalLayout from './LegalLayout';

const EFFECTIVE_DATE = '2026-01-27';

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="How FanClubZ collects, uses, and protects information when you use our website and app."
    >
      <div className="space-y-6 text-sm text-white/80">
        <p className="text-white/70">
          <strong className="text-white">Effective date:</strong> {EFFECTIVE_DATE}
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1) Who we are</h2>
          <p>
            FanClubZ (“<strong className="text-white">FanClubZ</strong>”, “<strong className="text-white">we</strong>”,
            “<strong className="text-white">us</strong>”) operates:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-white">Landing site</strong> at <span className="text-white">fanclubz.app</span>
            </li>
            <li>
              <strong className="text-white">App</strong> at <span className="text-white">app.fanclubz.app</span> and
              through our mobile app builds (Capacitor).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2) What FanClubZ does</h2>
          <p>
            FanClubZ is a social predictions product. Users can create and participate in predictions, discuss outcomes,
            and track activity. The app supports a <strong className="text-white">Zaurum</strong> experience, and
            may offer <strong className="text-white">optional</strong> wallet-connected functionality depending on the
            platform/build and user choice.
          </p>
          <p className="text-white/70">
            <strong className="text-white">Zaurum has no cash value</strong> and is provided for exploration and
            entertainment.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3) Information we collect</h2>
          <p>We collect information in the following categories:</p>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">A. Account and profile information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email address and authentication identifiers (e.g., OAuth provider tokens/IDs where applicable)</li>
              <li>Username, display name, avatar, and profile fields you choose to provide</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">B. User-generated content (UGC)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Predictions you create, comments, messages, and other content you submit</li>
              <li>Metadata tied to that content (timestamps, IDs, and moderation status)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">C. App usage and diagnostics</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Basic usage events (e.g., screens visited, feature interactions)</li>
              <li>Performance and reliability data (e.g., error logs, crash/diagnostic signals)</li>
              <li>Approximate device/app details (browser type, OS, app version)</li>
            </ul>
            <p className="text-white/70">
              We use this information to keep the service working, improve performance, prevent abuse, and support users.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">D. Wallet-related information (optional)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                If you choose to connect a wallet, we may process a public wallet address and related public blockchain
                activity needed to display balances or activity.
              </li>
              <li>
                We do <strong className="text-white">not</strong> collect or store your private keys or seed phrase.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">E. Support communications</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Messages you send to support (including attachments you choose to share)</li>
              <li>Information needed to troubleshoot (e.g., app version, device type, screenshots)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">F. Cookies and local storage</h3>
            <p>
              We use browser storage (such as local storage) and may use cookies or similar technologies to keep you
              signed in, remember preferences, and improve reliability.
            </p>
            <p className="text-white/70">
              See <a className="underline hover:text-white" href="/cookies">Cookie Policy</a> for details.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4) How we use information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and operate the service (accounts, predictions, notifications, and core features)</li>
            <li>Maintain security, prevent fraud/abuse, and enforce policies</li>
            <li>Provide support and respond to requests</li>
            <li>Improve features and performance</li>
            <li>Comply with legal obligations and respond to lawful requests</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5) How we share information</h2>
          <p>
            We do not sell your personal information. We may share information in the following limited situations:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-white">Service providers</strong>: hosting, databases, analytics/monitoring, and
              support tooling that help us run FanClubZ.
            </li>
            <li>
              <strong className="text-white">Legal and safety</strong>: to comply with law, protect users, enforce our
              terms, or respond to lawful requests.
            </li>
            <li>
              <strong className="text-white">Public content</strong>: content you choose to publish (e.g., predictions or
              public profile info) may be visible to others.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">6) Data retention</h2>
          <p>
            We retain information for as long as reasonably necessary to provide the service, comply with legal
            obligations, resolve disputes, and enforce our agreements.
          </p>
          <p className="text-white/70">
            If you request account deletion, we will delete or anonymize information where feasible, subject to legal or
            security retention needs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">7) Your choices and rights</h2>
          <p>Depending on where you live, you may have rights to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access, correct, or delete certain personal information</li>
            <li>Object to or restrict certain processing</li>
            <li>Receive a copy of certain information in a portable format</li>
          </ul>
          <p className="text-white/70">
            To make a request, contact us using the details in the “Contact us” section below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">8) Children and age</h2>
          <p>
            FanClubZ is <strong className="text-white">not intended for children under 13</strong>. If you believe a
            child under 13 has provided personal information, contact us and we will take appropriate steps.
          </p>
          <p className="text-white/70">
            If you choose to use wallet-connected features, you are responsible for ensuring you meet any applicable age
            or legal requirements in your jurisdiction.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">9) Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational measures designed to protect information.
            However, no method of transmission or storage is 100% secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">10) International transfers</h2>
          <p>
            Your information may be processed in locations where we or our service providers operate. We take steps
            designed to ensure appropriate protections are in place when required.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">11) Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will update the “Effective date” above and may
            provide additional notice where appropriate.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">12) Contact us</h2>
          <p>
            For privacy questions or requests, email{' '}
            <a className="underline hover:text-white" href="mailto:tech@fanclubz.app">
              tech@fanclubz.app
            </a>
            .
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
