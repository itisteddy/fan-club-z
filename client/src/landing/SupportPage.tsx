import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout';

const SUPPORT_EMAIL = 'tech@fanclubz.app';

export default function SupportPage() {
  return (
    <LegalLayout
      title="Support"
      description="Contact information, troubleshooting steps, and help links for FanClubZ."
    >
      <div className="space-y-8 text-sm text-white/80">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p>
            Email us at{' '}
            <a className="underline hover:text-white" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p className="text-white/70">
            Include: the email on your account, your device type (iOS/Android/Web), and any screenshots or error text.
          </p>
          <p className="text-white/70">
            Typical response window: <strong className="text-white">1–3 business days</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Common issues</h2>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">Login issues</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ensure you’re using the same sign-in method you used when creating the account.</li>
              <li>Check your spam folder if you’re using email link sign-in.</li>
              <li>Try restarting the app and checking your internet connection.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">OAuth opens in browser but doesn’t return to the app (mobile)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Update to the latest app build.</li>
              <li>After completing login, wait a moment for the redirect to return to FanClubZ.</li>
              <li>If it remains stuck, close the browser tab and re-open the app.</li>
              <li>
                If the issue persists, email support with your device model and Android/iOS version so we can reproduce it.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">Demo Credits vs wallet-connected mode</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Demo credits have no cash value.</strong></li>
              <li>
                If you connect a wallet, ensure you’re on the supported network and that your wallet is connected in the app.
              </li>
              <li>
                If your balances look wrong, try the app’s refresh action and confirm you’re signed into the correct account.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-white">App crashes or blank screen</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Force-close and relaunch the app.</li>
              <li>Ensure you have a stable connection.</li>
              <li>If the issue repeats, email support with steps to reproduce and screenshots if possible.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Account deletion / data requests</h2>
          <p>
            To request account deletion or a copy of your data, email{' '}
            <a className="underline hover:text-white" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            {' '}from the email address on your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Helpful links</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><Link className="underline hover:text-white" to="/privacy">Privacy Policy</Link></li>
            <li><Link className="underline hover:text-white" to="/terms">Terms of Service</Link></li>
            <li><Link className="underline hover:text-white" to="/guidelines">Community Guidelines</Link></li>
            <li><Link className="underline hover:text-white" to="/cookies">Cookie Policy</Link></li>
            <li><Link className="underline hover:text-white" to="/docs/funding-guide">Funding guide</Link></li>
          </ul>
        </section>
      </div>
    </LegalLayout>
  );
}

