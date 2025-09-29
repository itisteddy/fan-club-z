// Test component to verify PredictionCardV3 works correctly
import React from 'react';
import PredictionCardV3, { PredictionCardV3Skeleton } from './predictions/PredictionCardV3';

const TestPredictionCardV3: React.FC = () => {
  const mockPrediction = {
    id: "test-123",
    title: "Will the new iPhone 15 have a foldable screen by October 2025?",
    category: "tech",
    endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    pool: 750,
    players: 23,
    options: [
      { label: "Yes", odds: 2.0 },
      { label: "No", odds: 1.8 }
    ],
    description: "A test prediction about foldable iPhone technology"
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">PredictionCardV3 Test</h1>
      
      <div>
        <h2 className="text-lg font-semibold mb-2">Live Card</h2>
        <PredictionCardV3
          prediction={mockPrediction}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Skeleton Loading State</h2>
        <PredictionCardV3Skeleton />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Card Without Image</h2>
        <PredictionCardV3
          prediction={{
            ...mockPrediction,
            id: "test-no-image",
            title: "A prediction without a thumbnail image"
          }}
        />
      </div>
    </div>
  );
};

export default TestPredictionCardV3;
