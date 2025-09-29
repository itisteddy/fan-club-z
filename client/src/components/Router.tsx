// Note: This Router component using wouter is deprecated
// The main app now uses react-router-dom consistently
// This file is kept for reference but should not be used

// Import unified pages
import DiscoverPage from '../pages/DiscoverPage';
import UnifiedMyBetsPage from '../pages/UnifiedMyBetsPage';
import CreatePredictionPage from '../pages/CreatePredictionPage';
import UnifiedLeaderboardPage from '../pages/UnifiedLeaderboardPage';
import UnifiedProfilePage from '../pages/UnifiedProfilePage';
import UnifiedWalletPage from '../pages/UnifiedWalletPage';
import UnifiedPredictionDetailsPage from '../pages/UnifiedPredictionDetailsPage';
import AuthCallback from '../pages/auth/AuthCallback';

export const Router: React.FC = () => {
  const { isAuthenticated, loading } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Switch>
      {/* Auth callback route - accessible to all */}
      <Route path="/auth/callback" component={AuthCallback} />
      
      {/* Main app routes */}
      <Route path="/" component={DiscoverPage} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/mybets" component={UnifiedMyBetsPage} />
      <Route path="/create" component={CreatePredictionPage} />
      <Route path="/leaderboard" component={UnifiedLeaderboardPage} />
      <Route path="/profile" component={UnifiedProfilePage} />
      <Route path="/profile/:userId" component={UnifiedProfilePage} />
      <Route path="/wallet" component={UnifiedWalletPage} />
      <Route path="/prediction/:id" component={UnifiedPredictionDetailsPage} />
      
      {/* Fallback */}
      <Route component={DiscoverPage} />
    </Switch>
  );
};

export default Router;
