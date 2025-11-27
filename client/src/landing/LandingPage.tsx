import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { openAuthGate } from '../auth/authGateAdapter';

const CURRENT_YEAR = new Date().getFullYear();

// Simple, static marketing landing page used when VITE_BUILD_TARGET=landing.
// Content adapted from the saved production HTML snapshot, with APK links
// updated to point at the latest FanClubZ.apk (v2.0.78).
// Landing page ready for production deployment.
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  
  // Production URLs
  const PROD_APP_URL = 'https://app.fanclubz.app';

  // Handle "Get started" CTA
  // In production: If authenticated, navigate to app.fanclubz.app/discover
  //                If not authenticated, open auth modal
  // In local dev: Navigate to /discover (same behavior)
  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (import.meta.env.PROD) {
        window.location.href = `${PROD_APP_URL}/discover`;
      } else {
        navigate('/discover');
      }
    } else {
      openAuthGate({ intent: 'place_prediction' });
    }
  };


  return (
    <div className="bg-gradient-to-b from-[#211234] via-[#1b1130] to-[#130c24] text-white min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/brand/fcz-logomark.png"
              alt="FanClubZ"
              className="h-8 w-8"
              style={{ objectFit: 'contain' }}
            />
            <span className="text-lg font-semibold tracking-wide">FanClubZ</span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_20%_20%,rgba(34,197,94,0.15),transparent_60%),radial-gradient(600px_circle_at_80%_0%,rgba(59,130,246,0.12),transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-balance text-4xl font-extrabold leading-tight sm:text-5xl">
                Predict trending topics with friends
              </h1>
              <p className="mt-4 text-lg text-white/80">
                Make a prediction, lock a stake, compare outcomes with friends.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleGetStarted}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black shadow-xl transition hover:brightness-95"
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-center text-2xl font-bold">Why choose FanClubZ?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-white/70">
            The most engaging way to predict what happens next. Join communities, build credibility, and earn when you
            get it right.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-white/10 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-emerald-300"
                >
                  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <div className="text-sm font-semibold">Real time odds</div>
              <p className="mt-1 text-sm text-white/70">Make predictions as events unfold with dynamic odds.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-white/10 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-emerald-300"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <path d="M16 3.128a4 4 0 0 1 0 7.744" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <div className="text-sm font-semibold">Social Predictions</div>
              <p className="mt-1 text-sm text-white/70">Follow top predictors, share insights, and discover trends.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-white/10 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-emerald-300"
                >
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="text-sm font-semibold">Secure &amp; Fair</div>
              <p className="mt-1 text-sm text-white/70">Transparent rules, verifiable outcomes, and fast payouts.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h3 className="text-xl font-semibold">How it works</h3>
          <ol className="mt-4 grid list-decimal gap-3 pl-6 text-white/80 md:grid-cols-2">
            <li>Pick a prediction that matches your interest.</li>
            <li>Choose an outcome you believe will happen.</li>
            <li>Stake an amount you&apos;re comfortable with.</li>
            <li>If you&apos;re right, you win based on the final odds.</li>
          </ol>
        </section>


        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
            FAQ
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                question: 'Is it free to join?',
                answer: 'Yes. Browsing predictions is free. You only stake when placing a prediction.',
              },
              {
                question: 'Where can I use FanClubZ?',
                answer: 'Anywhere the web app loads. Android APK is available; iOS is coming soon.',
              },
              {
                question: 'How are outcomes decided?',
                answer:
                  'Each prediction has clear settlement rules and sources. Winning stakes are paid out accordingly.',
              },
              {
                question: 'Is my data safe?',
                answer:
                  'We use modern security practices for auth and data storage. You can delete your data anytime.',
              },
            ].map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-white/10 p-4 open:bg-white/5"
              >
                <summary className="cursor-pointer list-none select-none font-medium text-white/90">
                  <div className="flex items-center justify-between gap-3">
                    <span>{item.question}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 text-white/50 transition group-open:rotate-180"
                    >
                      <path d="M12 7v14" />
                      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                    </svg>
                  </div>
                </summary>
                <p className="mt-2 text-sm text-white/70">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
         <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <img
                src="/brand/fcz-logomark.png"
                alt="FanClubZ"
                className="h-6 w-6"
                style={{ objectFit: 'contain' }}
              />
              <span className="font-semibold">FanClubZ</span>
            </div>
            <p className="text-sm text-white/70">
              Social predictions done right. Turn your opinions into outcomes.
            </p>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-white/80">Company</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a 
                  href={import.meta.env.PROD ? `${PROD_APP_URL}` : '#'} 
                  className="hover:text-white"
                  {...(import.meta.env.PROD ? {} : { onClick: (e) => { e.preventDefault(); navigate('/discover'); } })}
                >
                  Web App
                </a>
              </li>
              <li>
                <a 
                  href="mailto:tech@fanclubz.app" 
                  className="hover:text-white"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-white/80">Community</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a
                  href="https://www.instagram.com/fanclubzapp?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/fanclubzapp?s=21&t=azQHKJXvTx2oYBcMg4IStg"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/Bxvet6BU"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/Fanclubzapp"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
          © {CURRENT_YEAR} FanClubZ. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;


