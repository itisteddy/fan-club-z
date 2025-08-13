import React from 'react';
import { useAuthStore } from '../store/authStore';
import { usePredictionStore } from '../store/predictionStore';
import { useLocation } from 'wouter';

const DebugInfo: React.FC = () => {
  const { isAuthenticated, loading, initialized, user } = useAuthStore();
  const { predictions, loading: predictionsLoading } = usePredictionStore();
  const [location] = useLocation();
  
  return (
    <div className="fixed bottom-20 right-4 bg-black text-white p-4 rounded-lg max-w-sm text-xs z-[10000]">
      <h4 className="font-bold mb-2 text-green-400">Debug Info</h4>
      <div className="space-y-1">
        <div>Location: {location}</div>
        <div>Auth Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Auth'}</div>
        <div>Auth Loading: {loading ? '⏳ Loading' : '✅ Ready'}</div>
        <div>Auth Initialized: {initialized ? '✅ Yes' : '❌ No'}</div>
        <div>User: {user?.email || 'None'}</div>
        <div>Predictions: {predictions?.length || 0} items</div>
        <div>Predictions Loading: {predictionsLoading ? '⏳ Loading' : '✅ Ready'}</div>
        <button 
          onClick={async () => {
            console.log('🔄 Manual refresh triggered from debug panel');
            const store = usePredictionStore.getState();
            await store.refreshPredictions(true);
          }}
          className="mt-2 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
        >
          Force Refresh
        </button>
      </div>
    </div>
  );
};

export default DebugInfo;
