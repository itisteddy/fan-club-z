import React, { useEffect, useState } from 'react';
import { usePredictionStore } from '../store/predictionStore';

const PredictionStoreTest: React.FC = () => {
  const { 
    predictions, 
    loading, 
    error, 
    initialized, 
    lastFetch,
    fetchPredictions,
    refreshPredictions 
  } = usePredictionStore();
  const [testStatus, setTestStatus] = useState<string>('');

  const runTest = async () => {
    console.log('🧪 Running prediction store test...');
    setTestStatus('Testing...');
    
    try {
      // Force refresh with cache bypass
      await refreshPredictions(true);
      
      const state = usePredictionStore.getState();
      console.log('📊 Full prediction store state:', state);
      
      setTestStatus(`Test complete: ${state.predictions.length} predictions found`);
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestStatus(`Test failed: ${error}`);
    }
  };

  useEffect(() => {
    console.log('🔍 PredictionStoreTest mounted, store state:', {
      predictions: predictions?.length,
      loading,
      error,
      initialized,
      lastFetch: new Date(lastFetch).toLocaleTimeString()
    });
  }, [predictions, loading, error, initialized, lastFetch]);

  return (
    <div className="fixed top-4 right-4 bg-blue-900 text-white p-4 rounded-lg max-w-md text-xs z-[10001]">
      <h4 className="font-bold mb-2 text-blue-300">Prediction Store Test</h4>
      <div className="space-y-1 mb-3">
        <div>Predictions Count: {predictions?.length || 0}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Error: {error || 'None'}</div>
        <div>Initialized: {initialized ? 'Yes' : 'No'}</div>
        <div>Last Fetch: {lastFetch ? new Date(lastFetch).toLocaleTimeString() : 'Never'}</div>
        <div>Test Status: {testStatus}</div>
      </div>
      
      <div className="space-y-2">
        <button 
          onClick={runTest}
          className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
        >
          Run Store Test
        </button>
        
        <button 
          onClick={() => {
            const state = usePredictionStore.getState();
            console.log('📋 Current store state:', state);
            alert(`Predictions: ${state.predictions.length}, Loading: ${state.loading}, Error: ${state.error}`);
          }}
          className="w-full px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
        >
          Log Store State
        </button>
      </div>
      
      {predictions && predictions.length > 0 && (
        <div className="mt-3 pt-2 border-t border-blue-700">
          <div className="text-blue-300 font-semibold mb-1">Sample Predictions:</div>
          {predictions.slice(0, 2).map((p, idx) => (
            <div key={p.id} className="text-xs mb-1">
              {idx + 1}. {p.title?.substring(0, 30)}...
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PredictionStoreTest;
