import React from 'react';
import LegalLayout from './LegalLayout';

const EFFECTIVE_DATE = '2026-01-27';

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      description="The rules for using FanClubZ, including accounts, acceptable use, and important disclaimers."
    >
      <div className="space-y-6 text-sm text-white/80">
        <p className="text-white/70">
          <strong className="text-white">Effective date:</strong> {EFFECTIVE_DATE}
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1) Agreement</h2>
          <p>
            These Terms of Service (“<strong className="text-white">Terms</strong>”) govern your use of FanClubZ’s
            websites, apps, and related services (collectively, the “<strong className="text-white">Service</strong>”).
            By accessing or using the Service, you agree to these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2) Eligibility</h2>
          <p>
            You must be at least <strong className="text-white">13 years old</strong> to use the Service. If you choose
            to connect a wallet or use any wallet-connected functionality, you are responsible for ensuring you meet any
            age, legal, and regulatory requirements that apply to you in your jurisdiction.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3) Accounts and authentication</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must provide accurate information and keep it up to date.</li>
            <li>
              You may authenticate via email or third-party OAuth providers where available. Your use of those providers
              is subject to their own terms and policies.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4) The FanClubZ experience (Zaurum vs wallet-connected)</h2>
          <p>
            FanClubZ supports a Zaurum experience and may support wallet-connected functionality depending on the
            platform/build and your choices.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-white">Zaurum has no cash value</strong> and is for entertainment and
              product exploration.
            </li>
            <li>
              If you connect a wallet, you are responsible for wallet security, transactions, network fees, and any
              outcomes resulting from your actions.
            </li>
            <li>
              We do <strong className="text-white">not</strong> custody private keys or seed phrases.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5) User content (UGC)</h2>
          <p>
            You may be able to create content such as predictions, comments, and profile information (“
            <strong className="text-white">User Content</strong>”). You retain ownership of your User Content, but you
            grant FanClubZ a license to host, store, display, and distribute it as necessary to operate the Service.
          </p>
          <p className="text-white/70">
            You are responsible for your User Content and for ensuring it does not violate these Terms or any law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">6) Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Harass, threaten, or target others with hate or discriminatory content</li>
            <li>Post illegal content, exploitative content, or content that infringes others’ rights</li>
            <li>Impersonate others, attempt to deceive users, or run scams</li>
            <li>Attempt to gain unauthorized access, scrape, or disrupt the Service</li>
            <li>Upload malware or abuse APIs in a way that harms the Service or users</li>
            <li>Share private or sensitive information about others (“doxxing”)</li>
          </ul>
          <p className="text-white/70">
            We may remove content or restrict accounts that violate these rules.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">7) Disclaimers</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              FanClubZ is provided “as is” and “as available.” We do not guarantee the Service will be uninterrupted or
              error-free.
            </li>
            <li>
              Predictions are informational/entertainment content. We do not guarantee any outcome, accuracy, or result.
            </li>
            <li>
              Zaurum is not money and has no cash value. Any Zaurum balance is for in-app experience only.
            </li>
            <li>
              If you connect a wallet, blockchain activity is public and transactions may be irreversible.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">8) Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, FanClubZ will not be liable for indirect, incidental, special,
            consequential, or punitive damages, or for any loss of profits, data, or goodwill arising from your use of
            the Service.
          </p>
          <p className="text-white/70">
            Some jurisdictions do not allow certain limitations, so parts of this section may not apply to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">9) Termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or terminate access if we reasonably believe you
            have violated these Terms, pose a risk to other users, or if we must do so to comply with law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">10) Changes to the Service or Terms</h2>
          <p>
            We may update the Service and these Terms from time to time. We will update the “Effective date” above and
            may provide additional notice where appropriate.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">11) Apple/Google app store terms</h2>
          <p>
            If you download FanClubZ from an app store, your use may also be subject to the store’s terms. Where
            applicable, Apple’s standard End User License Agreement (EULA) may apply unless replaced by a custom EULA.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">12) Contact</h2>
          <p>
            Questions about these Terms? Contact{' '}
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
