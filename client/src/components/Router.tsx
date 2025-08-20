import React from 'react';
import { Route, Switch } from 'wouter';
import { useAuth } from '../providers/AuthProvider';
import { MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LoadingScreen } from './LoadingScreen';

// Import pages directly
import DiscoverPage from '../pages/DiscoverPage';
import PredictionsPage from '../pages/PredictionsPage';
import CreatePredictionPage from '../pages/CreatePredictionPage';
import ClubsPage from '../pages/ClubsPage';
import WalletPage from '../pages/WalletPage';
import ProfilePage from '../pages/ProfilePage';
import PredictionDetailPage from '../pages/PredictionDetailPage';
import ClubDetailPage from '../pages/ClubDetailPage';

export const Router: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <AuthLayout>
        <Switch>
          <Route path="/register" component={RegisterPage} />
          <Route path="/" component={LoginPage} />
          <Route component={LoginPage} />
        </Switch>
      </AuthLayout>
    );
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={DiscoverPage} />
        <Route path="/discover" component={DiscoverPage} />
        <Route path="/predictions" component={PredictionsPage} />
        <Route path="/create" component={CreatePredictionPage} />
        <Route path="/clubs" component={ClubsPage} />
        <Route path="/wallet" component={WalletPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/prediction/:id" component={PredictionDetailPage} />
        <Route path="/club/:id" component={ClubDetailPage} />
        <Route component={DiscoverPage} />
      </Switch>
    </MainLayout>
  );
};
