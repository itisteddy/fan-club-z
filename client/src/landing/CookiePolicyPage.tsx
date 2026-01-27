import React from 'react';
import LegalLayout from './LegalLayout';

const EFFECTIVE_DATE = '2026-01-27';

export default function CookiePolicyPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      description="How FanClubZ uses cookies and similar storage technologies."
    >
      <div className="space-y-6 text-sm text-white/80">
        <p className="text-white/70">
          <strong className="text-white">Effective date:</strong> {EFFECTIVE_DATE}
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">1) What we mean by “cookies”</h2>
          <p>
            “Cookies” are small text files stored by your browser. We also use similar technologies such as local storage
            and session storage. On mobile (Capacitor), similar storage may be used within the app’s webview.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">2) How we use them</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-white">Essential</strong>: to keep you signed in and remember core preferences.</li>
            <li>
              <strong className="text-white">Reliability & security</strong>: to help prevent abuse and keep the service
              stable.
            </li>
            <li>
              <strong className="text-white">Analytics (if enabled)</strong>: to understand performance and usage trends,
              such as page load speed or error rates.
            </li>
          </ul>
          <p className="text-white/70">
            We aim to keep analytics conservative and focused on improving reliability. We do not use cookies to store
            payment card data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">3) Your choices</h2>
          <p>
            You can control cookies through your browser settings. You can also clear site data to remove stored values.
            Note: disabling essential storage may prevent the Service from working correctly (e.g., you may be signed out).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">4) Contact</h2>
          <p>
            Questions? Email{' '}
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

