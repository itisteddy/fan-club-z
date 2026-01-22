import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FRONTEND_URL } from '@/utils/environment';

/**
 * RedirectToApp
 * Resolves deployment confusion by redirecting app routes that hit the landing domain
 * (fanclubz.app) over to the main app domain (app.fanclubz.app), preserving path+query.
 */
export const RedirectToApp: React.FC = () => {
  const loc = useLocation();
  useEffect(() => {
    const appUrl = FRONTEND_URL || 'https://app.fanclubz.app';
    const target = `${appUrl}${loc.pathname}${loc.search}${loc.hash}`;
    window.location.replace(target);
  }, [loc.pathname, loc.search, loc.hash]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-300">Redirecting…</div>
    </div>
  );
};

export default RedirectToApp;

