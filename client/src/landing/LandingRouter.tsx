import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import FundingGuidePage from './FundingGuidePage';
import LandingAdminRouter from './LandingAdminRouter';
import RedirectToApp from './RedirectToApp';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import TermsPage from './TermsPage';
import SupportPage from './SupportPage';
import CommunityGuidelinesPage from './CommunityGuidelinesPage';
import CookiePolicyPage from './CookiePolicyPage';

/**
 * LandingRouter handles routing for the landing/marketing site (fanclubz.app)
 * This is separate from the main app (app.fanclubz.app)
 */
const LandingRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs/funding-guide" element={<FundingGuidePage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/guidelines" element={<CommunityGuidelinesPage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      {/* If app routes hit landing domain, redirect to main app to avoid deployment confusion */}
      <Route path="/predictions/*" element={<RedirectToApp />} />
      <Route path="/prediction/*" element={<RedirectToApp />} />
      <Route path="/profile/*" element={<RedirectToApp />} />
      <Route path="/wallet/*" element={<RedirectToApp />} />
      <Route path="/discover/*" element={<RedirectToApp />} />
      <Route path="/bets/*" element={<RedirectToApp />} />
      <Route path="/create/*" element={<RedirectToApp />} />
      <Route path="/rankings/*" element={<RedirectToApp />} />
      {/* Admin routes - must come before catch-all */}
      <Route path="/admin" element={<LandingAdminRouter />} />
      <Route path="/admin/*" element={<LandingAdminRouter />} />
      {/* Fallback to landing page for any unmatched routes */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
};

export default LandingRouter;
