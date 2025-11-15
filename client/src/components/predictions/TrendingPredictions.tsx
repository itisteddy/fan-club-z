import React from 'react';
// import { PredictionCard } from './PredictionCard'; // Module not found - commented out
import { Prediction } from '../../store/predictionStore';

interface TrendingPredictionsProps {
  predictions: Prediction[];
}

export const TrendingPredictions: React.FC<TrendingPredictionsProps> = ({ predictions }) => {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-4 pb-2">
        {predictions.map((prediction) => (
          <div key={prediction.id} className="min-w-[280px]">
            {/* PredictionCard component not found - placeholder */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">{prediction.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
