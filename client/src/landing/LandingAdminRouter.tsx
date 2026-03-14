import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminGate from '@/components/admin/AdminGate';
import AdminLayout from '@/components/admin/AdminLayout';

import AdminHomePage from '@/pages/admin/AdminHomePage';
import AdminAnalyticsDashboard from '@/pages/admin/AdminAnalyticsDashboard';
import ReferralScorecardsPage from '@/pages/admin/ReferralScorecardsPage';
import TeamAnalyticsPage from '@/pages/admin/TeamAnalyticsPage';
import TeamMemberDetailPage from '@/pages/admin/TeamMemberDetailPage';
import UsersPage from '@/pages/admin/UsersPage';
import UserDetailPage from '@/pages/admin/UserDetailPage';
import UserViewPage from '@/pages/admin/UserViewPage';
import WalletsPage from '@/pages/admin/WalletsPage';
import UserWalletPage from '@/pages/admin/UserWalletPage';
import PredictionsPage from '@/pages/admin/PredictionsPage';
import PredictionDetailPage from '@/pages/admin/PredictionDetailPage';
import SettlementsPage from '@/pages/admin/SettlementsPage';
import SettlementDetailPage from '@/pages/admin/SettlementDetailPage';
import SupportPage from '@/pages/admin/SupportPage';
import ModerationPage from '@/pages/admin/ModerationPage';
import ConfigPage from '@/pages/admin/ConfigPage';
import AuditLogPage from '@/pages/admin/AuditLogPage';
import { CategoriesPage } from '@/pages/admin/CategoriesPage';

/**
 * LandingAdminRouter mounts the admin dashboard under the WEBSITE build router.
 * This enables fanclubz.app/admin/* when VITE_BUILD_TARGET=landing.
 */
const LandingAdminRouter: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname.toLowerCase();
    const shouldCanonicalize = host === 'app.fanclubz.app' || host === 'www.fanclubz.app';
    if (!shouldCanonicalize) return;
    const target = `https://fanclubz.app${location.pathname}${location.search}${location.hash}`;
    if (window.location.href !== target) {
      window.location.replace(target);
    }
  }, [location.pathname, location.search, location.hash]);

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'app.fanclubz.app' || host === 'www.fanclubz.app') {
      return null;
    }
  }

  return (
    <AdminGate>
      <AdminLayout>
        <Routes>
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsDashboard />} />
          <Route path="/admin/analytics/referrals" element={<ReferralScorecardsPage />} />
          <Route path="/admin/analytics/team" element={<TeamAnalyticsPage />} />
          <Route path="/admin/analytics/team/:memberId" element={<TeamMemberDetailPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/users/:userId" element={<UserDetailPage />} />
          <Route path="/admin/users/:userId/view" element={<UserViewPage />} />
          <Route path="/admin/wallets" element={<WalletsPage />} />
          <Route path="/admin/wallets/:userId" element={<UserWalletPage />} />
          <Route path="/admin/predictions" element={<PredictionsPage />} />
          <Route path="/admin/predictions/:predictionId" element={<PredictionDetailPage />} />
          <Route path="/admin/settlements" element={<SettlementsPage />} />
          <Route path="/admin/settlements/:predictionId" element={<SettlementDetailPage />} />
          <Route path="/admin/support" element={<SupportPage />} />
          <Route path="/admin/moderation" element={<ModerationPage />} />
          <Route path="/admin/config" element={<ConfigPage />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="/admin/audit" element={<AuditLogPage />} />
        </Routes>
      </AdminLayout>
    </AdminGate>
  );
};

export default LandingAdminRouter;
