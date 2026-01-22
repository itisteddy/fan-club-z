import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminGate from '@/components/admin/AdminGate';
import AdminLayout from '@/components/admin/AdminLayout';

import AdminHomePage from '@/pages/admin/AdminHomePage';
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

/**
 * LandingAdminRouter mounts the admin dashboard under the WEBSITE build router.
 * This enables fanclubz.app/admin/* when VITE_BUILD_TARGET=landing.
 */
const LandingAdminRouter: React.FC = () => {
  return (
    <AdminGate>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<AdminHomePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="users/:userId/view" element={<UserViewPage />} />
          <Route path="wallets" element={<WalletsPage />} />
          <Route path="wallets/:userId" element={<UserWalletPage />} />
          <Route path="predictions" element={<PredictionsPage />} />
          <Route path="predictions/:predictionId" element={<PredictionDetailPage />} />
          <Route path="settlements" element={<SettlementsPage />} />
          <Route path="settlements/:predictionId" element={<SettlementDetailPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="audit" element={<AuditLogPage />} />
        </Routes>
      </AdminLayout>
    </AdminGate>
  );
};

export default LandingAdminRouter;


