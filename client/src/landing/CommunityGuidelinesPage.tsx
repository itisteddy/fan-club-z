import React from 'react';
import LegalLayout from './LegalLayout';

const EFFECTIVE_DATE = '2026-01-27';

export default function CommunityGuidelinesPage() {
  return (
    <LegalLayout
      title="Community Guidelines"
      description="Rules for participating on FanClubZ so the community stays safe, useful, and fun."
    >
      <div className="space-y-6 text-sm text-white/80">
        <p className="text-white/70">
          <strong className="text-white">Effective date:</strong> {EFFECTIVE_DATE}
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">1) Be respectful</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>No hate speech, harassment, threats, or targeted abuse.</li>
            <li>No bullying or brigading.</li>
            <li>Don’t encourage self-harm or violence.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">2) Keep content lawful and safe</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>No illegal content or instructions for wrongdoing.</li>
            <li>No sexual exploitation, especially involving minors (zero tolerance).</li>
            <li>No doxxing or sharing private information about others.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">3) Don’t scam or impersonate</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>No impersonation of people, brands, or organizations.</li>
            <li>No phishing, fraud, or deceptive “support” messages.</li>
            <li>Never ask others for seed phrases or private keys.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">4) Predictions should be clear and good-faith</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Write clear prediction statements and outcomes.</li>
            <li>Don’t spam duplicate predictions or manipulate discussions.</li>
            <li>Do not post market-manipulation instructions or coordinated abuse.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">5) Enforcement</h2>
          <p>
            We may remove content, restrict features, or suspend/terminate accounts that violate these guidelines or our
            Terms. Enforcement may be based on reports, automated signals, or review.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">6) Reporting</h2>
          <p>
            If you see content that violates these guidelines, contact{' '}
            <a className="underline hover:text-white" href="mailto:tech@fanclubz.app">
              tech@fanclubz.app
            </a>
            {' '}with links/screenshots and any relevant context.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}

