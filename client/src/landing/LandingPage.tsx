import React from 'react';

const CURRENT_YEAR = new Date().getFullYear();

// Simple, static marketing landing page used when VITE_BUILD_TARGET=landing.
// Content adapted from the saved production HTML snapshot, with APK links
// updated to point at the latest app-latest.apk (v2.0.78).
const LandingPage: React.FC = () => {
  const APK_URL = '/downloads/app-latest.apk';
  const APK_FILENAME = 'FanClubZ-v2.0.78.apk';
  const APK_VERSION = '2.0.78';
  const APK_SIZE_LABEL = '≈4.9MB';

  return (
    <div className="bg-gradient-to-b from-[#211234] via-[#1b1130] to-[#130c24] text-white min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/icons/icon-96.png"
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
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
            <div>
              <h1 className="text-balance text-4xl font-extrabold leading-tight sm:text-5xl">
                Turn insights into{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
                  rewards
                </span>
              </h1>
              <p className="mt-4 max-w-prose text-white/80">
                Create and join predictions on sports, pop culture, tech and more. Share your point of view,
                back it with a stake, and win based on real outcomes.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="https://app.fanclubz.app/"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-xl transition hover:brightness-95"
                >
                  {/* Globe icon */}
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
                    className="h-4 w-4"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  Open Web App
                </a>
                <a
                  href={APK_URL}
                  download={APK_FILENAME}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  {/* Smartphone icon */}
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
                    className="h-4 w-4"
                  >
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                    <path d="M12 18h.01" />
                  </svg>
                  Android APK ({APK_VERSION})
                </a>
              </div>

              {/* Social row */}
              <div className="mt-6 flex items-center gap-4">
                <a
                  href="https://www.instagram.com/fanclubzapp?utm_source=ig_web_button_share_sheet&igsh=b2xvYmYxdmZiZGQ="
                  aria-label="Instagram"
                  className="group rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
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
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://x.com/fanclubzapp?s=21&t=azQHKJXvTx2oYBcMg4IStg"
                  aria-label="Twitter"
                  className="group rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
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
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                  </svg>
                </a>
                <a
                  href="https://discord.gg/uTT9zVT9"
                  aria-label="Discord"
                  className="group rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
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
                    <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
                  </svg>
                </a>
                <a
                  href="https://t.me/Fanclubzapp"
                  aria-label="Telegram"
                  className="group rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
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
                    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                    <path d="m21.854 2.147-10.94 10.939" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Hero mockup card */}
            <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 shadow-2xl">
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex items-center gap-3 rounded-xl bg-black/40 px-4 py-2 backdrop-blur">
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
                    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
                    <path d="M20 2v4" />
                    <path d="M22 4h-4" />
                    <circle cx="4" cy="20" r="2" />
                  </svg>
                  <span className="text-sm text-white/90">Predict trending topics with friends</span>
                </div>
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
              <div className="text-sm font-semibold">Real‑time Markets</div>
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
            <li>Pick a market that matches your interest.</li>
            <li>Choose an outcome you believe will happen.</li>
            <li>Stake an amount you&apos;re comfortable with.</li>
            <li>If you&apos;re right, you win based on the final odds.</li>
          </ol>
        </section>

        {/* APK + install help */}
        <section id="download" className="mx-auto max-w-6xl px-4 pb-12">
          <div className="rounded-2xl border border-white/10 p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-semibold">Get the Android app</h3>
                <p className="mt-1 text-white/70">
                  Version {APK_VERSION} • {APK_SIZE_LABEL}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={APK_URL}
                  download={APK_FILENAME}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-xl transition hover:brightness-95"
                >
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
                    className="h-4 w-4"
                  >
                    <path d="M12 15V3" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                  </svg>
                  Download APK
                </a>
                <a
                  href="#install"
                  className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Install instructions
                </a>
              </div>
            </div>

            <div id="install" className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-xs font-semibold text-emerald-300">STEP 1</div>
                <div className="text-sm font-semibold">Allow unknown sources</div>
                <p className="mt-1 text-sm text-white/70">
                  Open Settings → Security and enable installation from your browser or file manager.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-xs font-semibold text-emerald-300">STEP 2</div>
                <div className="text-sm font-semibold">Download &amp; open APK</div>
                <p className="mt-1 text-sm text-white/70">
                  Tap the APK link above, then open it from the downloads tray or Files.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-xs font-semibold text-emerald-300">STEP 3</div>
                <div className="text-sm font-semibold">Install &amp; launch</div>
                <p className="mt-1 text-sm text-white/70">
                  Follow the prompts to install. Next updates will come automatically inside the app.
                </p>
              </div>
            </div>
          </div>
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
                answer: 'Yes. Browsing markets is free. You only stake when placing a prediction.',
              },
              {
                question: 'Where can I use FanClubZ?',
                answer: 'Anywhere the web app loads. Android APK is available; iOS is coming soon.',
              },
              {
                question: 'How are outcomes decided?',
                answer:
                  'Each market has clear settlement rules and sources. Winning stakes are paid out accordingly.',
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <img
                src="/icons/icon-96.png"
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
            <div className="mb-2 text-sm font-semibold text-white/80">Product</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="https://app.fanclubz.app/" className="hover:text-white">
                  Web App
                </a>
              </li>
              <li>
                <a href="#download" className="hover:text-white">
                  Android APK
                </a>
              </li>
              <li>
                <a href="#install" className="hover:text-white">
                  Install guide
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-white/80">Company</div>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="#about" className="hover:text-white">
                  About
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white">
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
                  href="https://www.instagram.com/fanclubzapp?utm_source=ig_web_button_share_sheet&igsh=b2xvYmYxdmZiZGQ="
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
                  href="https://discord.gg/uTT9zVT9"
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


