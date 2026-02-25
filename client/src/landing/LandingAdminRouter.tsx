import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * LandingAdminRouter fallback for landing builds.
 *
 * The full admin dashboard pages are not bundled in this release branch.
 * We keep a compile-safe redirect/placeholder so landing builds succeed
 * without shipping unrelated admin module work.
 */
const LandingAdminRouter: React.FC = () => {
  const location = useLocation();
  const [redirectingToCanonical, setRedirectingToCanonical] = useState(false);

  const canonicalRedirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const current = new URL(window.location.href);
      const host = current.hostname.toLowerCase();
      const isProdAlias = host === 'app.fanclubz.app' || host === 'www.fanclubz.app';
      if (!isProdAlias) return null;
      if (!current.pathname.startsWith('/admin')) return null;
      return `https://fanclubz.app${current.pathname}${current.search}${current.hash}`;
    } catch {
      return null;
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!canonicalRedirectUrl || typeof window === 'undefined') return;
    if (canonicalRedirectUrl === window.location.href) return;
    setRedirectingToCanonical(true);
    window.location.replace(canonicalRedirectUrl);
  }, [canonicalRedirectUrl]);

  if (redirectingToCanonical) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-300">Redirecting to admin…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-slate-200 text-lg font-semibold">Admin portal</p>
        <p className="text-slate-400 text-sm mt-2">
          Redirecting to the canonical admin app…
        </p>
        {!canonicalRedirectUrl && (
          <a
            href="https://fanclubz.app/admin"
            className="inline-flex mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Open Admin
          </a>
        )}
      </div>
    </div>
  );
};

export default LandingAdminRouter;
