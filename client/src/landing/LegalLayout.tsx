import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

const SITE_URL = 'https://fanclubz.app';
const APP_URL = 'https://app.fanclubz.app';
const SUPPORT_EMAIL = 'tech@fanclubz.app';

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function LegalLayout({ title, description, children }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `${title} • FanClubZ`;
  }, [title]);

  return (
    <div className="bg-gradient-to-b from-[#211234] via-[#1b1130] to-[#130c24] text-white min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2 hover:opacity-90">
              <img src="/brand/fcz-logomark.png" alt="FanClubZ" className="h-8 w-8" style={{ objectFit: 'contain' }} />
              <span className="text-lg font-semibold tracking-wide">FanClubZ</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm text-white/70">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/support" className="hover:text-white">Support</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <h1 className="text-3xl md:text-4xl font-extrabold">{title}</h1>
        {description ? <p className="mt-3 text-white/70">{description}</p> : null}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 leading-relaxed">
          {children}
        </div>

        <div className="mt-6 text-xs text-white/50">
          Canonical URLs: {' '}
          <a className="underline hover:text-white" href={`${SITE_URL}/privacy`} target="_blank" rel="noreferrer">{SITE_URL}/privacy</a>
          {' · '}
          <a className="underline hover:text-white" href={`${SITE_URL}/terms`} target="_blank" rel="noreferrer">{SITE_URL}/terms</a>
          {' · '}
          <a className="underline hover:text-white" href={`${SITE_URL}/support`} target="_blank" rel="noreferrer">{SITE_URL}/support</a>
          {' · '}
          App: {' '}
          <a className="underline hover:text-white" href={APP_URL} target="_blank" rel="noreferrer">{APP_URL}</a>
        </div>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/brand/fcz-logomark.png" alt="FanClubZ" className="h-6 w-6" style={{ objectFit: 'contain' }} />
              <span className="font-semibold">FanClubZ</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/support" className="hover:text-white transition-colors">Support</Link>
              <Link to="/guidelines" className="hover:text-white transition-colors">Community Guidelines</Link>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/50">
            © {CURRENT_YEAR} FanClubZ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

