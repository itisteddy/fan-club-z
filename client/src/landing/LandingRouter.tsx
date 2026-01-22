import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import FundingGuidePage from './FundingGuidePage';
import LandingAdminRouter from './LandingAdminRouter';

/**
 * LandingRouter handles routing for the landing/marketing site (fanclubz.app)
 * This is separate from the main app (app.fanclubz.app)
 */
const LandingRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs/funding-guide" element={<FundingGuidePage />} />
      {/* Admin routes - must come before catch-all */}
      <Route path="/admin" element={<LandingAdminRouter />} />
      <Route path="/admin/*" element={<LandingAdminRouter />} />
      {/* Fallback to landing page for any unmatched routes */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
};

export default LandingRouter;
