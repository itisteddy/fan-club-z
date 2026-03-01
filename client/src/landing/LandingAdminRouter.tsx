import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import { CategoriesPage } from '@/pages/admin/CategoriesPage';

/**
 * LandingAdminRouter mounts the admin dashboard under the WEBSITE build router.
 * This enables fanclubz.app/admin/* when VITE_BUILD_TARGET=landing.
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
    <AdminGate>
      <AdminLayout>
        <Routes>
          <Route index element={<AdminHomePage />} />
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
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="audit" element={<AuditLogPage />} />
        </Routes>
      </AdminLayout>
    </AdminGate>
  );
};

export default LandingAdminRouter;
