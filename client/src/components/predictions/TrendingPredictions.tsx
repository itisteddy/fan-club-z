import React from 'react';
import PredictionCard from '../PredictionCard';
import { Prediction } from '../../store/predictionStore';

interface TrendingPredictionsProps {
  predictions: Prediction[];
}

export const TrendingPredictions: React.FC<TrendingPredictionsProps> = ({ predictions }) => {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-4 pb-2">
        {predictions.map((prediction) => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            variant="default"
          />
        ))}
      </div>
    </div>
  );
};
