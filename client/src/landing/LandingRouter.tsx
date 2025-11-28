import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import FundingGuidePage from './FundingGuidePage';

/**
 * LandingRouter handles routing for the landing/marketing site (fanclubz.app)
 * This is separate from the main app (app.fanclubz.app)
 */
const LandingRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs/funding-guide" element={<FundingGuidePage />} />
      {/* Fallback to landing page for any unmatched routes */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
};

export default LandingRouter;
