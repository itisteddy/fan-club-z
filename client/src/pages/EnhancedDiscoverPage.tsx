import React, { useState } from 'react';
import EnhancedPredictionCard from '../components/EnhancedPredictionCard';
import PredictionPlacementModal from '../components/PredictionPlacementModal';
import { Prediction } from '../stores/types';

const EnhancedDiscoverPage: React.FC = () => {
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Example multi-option prediction data
  const samplePredictions: Prediction[] = [
    {
      id: '1',
      creatorId: 'creator-1',
      title: 'Which Premier League team will win the championship in 2026?',
      description: 'With Manchester United, Chelsea, Manchester City, Arsenal, and Liverpool all showing strong form, who will take the title?',
      category: 'Sports',
      type: 'multi_outcome',
      status: 'open',
      stakeMin: 10,
      stakeMax: 1000,
      poolTotal: 45600,
      entryDeadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      settlementMethod: 'auto',
      isPrivate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participantCount: 284,
      options: [
        { id: 'opt-1', label: 'Manchester City', totalStaked: 18240, currentOdds: 2.5 },
        { id: 'opt-2', label: 'Arsenal', totalStaked: 12350, currentOdds: 3.69 },
        { id: 'opt-3', label: 'Liverpool', totalStaked: 8750, currentOdds: 5.21 },
        { id: 'opt-4', label: 'Chelsea', totalStaked: 4560, currentOdds: 10.0 },
        { id: 'opt-5', label: 'Manchester United', totalStaked: 1700, currentOdds: 26.82 },
        { id: 'opt-6', label: 'Newcastle United', totalStaked: 0, currentOdds: 0 },
        { id: 'opt-7', label: 'Tottenham', totalStaked: 0, currentOdds: 0 },
        { id: 'opt-8', label: 'Brighton', totalStaked: 0, currentOdds: 0 }
      ]
    },
    {
      id: '2',
      creatorId: 'creator-2',
      title: 'Next iPhone release features',
      description: 'What major feature will Apple announce for the iPhone 16?',
      category: 'Tech',
      type: 'multi_outcome',
      status: 'open',
      stakeMin: 5,
      poolTotal: 12400,
      entryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      settlementMethod: 'manual',
      isPrivate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participantCount: 156,
      options: [
        { id: 'tech-1', label: 'Under-display Face ID', totalStaked: 4960, currentOdds: 2.5 },
        { id: 'tech-2', label: 'Satellite connectivity', totalStaked: 3720, currentOdds: 3.33 },
        { id: 'tech-3', label: 'Periscope zoom camera', totalStaked: 2480, currentOdds: 5.0 },
        { id: 'tech-4', label: 'Reverse wireless charging', totalStaked: 1240, currentOdds: 10.0 }
      ]
    },
    {
      id: '3',
      creatorId: 'creator-3',
      title: 'Will it rain in Lagos tomorrow?',
      description: 'Simple yes/no prediction for weather in Lagos',
      category: 'Weather',
      type: 'binary',
      status: 'open',
      stakeMin: 1,
      poolTotal: 850,
      entryDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      settlementMethod: 'auto',
      isPrivate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participantCount: 45,
      options: [
        { id: 'weather-1', label: 'Yes', totalStaked: 510, currentOdds: 1.67 },
        { id: 'weather-2', label: 'No', totalStaked: 340, currentOdds: 2.5 }
      ]
    }
  ];

  const handlePredict = (optionId: string) => {
    setIsModalOpen(true);
  };

  const handlePlacePrediction = (optionId: string, amount: number) => {
    console.log('Placing prediction:', { optionId, amount });
    // Handle prediction placement logic here
  };

  const handleLike = () => {
    console.log('Liked prediction');
  };

  const handleComment = () => {
    console.log('Comment on prediction');
  };

  const handleShare = () => {
    console.log('Share prediction');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Enhanced Prediction Cards</h1>
        
        {/* Default variant examples */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Multi-Option Predictions</h2>
          
          {samplePredictions.map((prediction) => (
            <EnhancedPredictionCard
              key={prediction.id}
              prediction={prediction}
              variant="default"
              onPredict={handlePredict}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              maxVisibleOptions={4} // Show max 4 options initially
            />
          ))}
          
          {/* Compact variant examples */}
          <h2 className="text-xl font-semibold text-gray-800 mt-12">Compact Cards (for feeds)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {samplePredictions.slice(0, 2).map((prediction) => (
              <EnhancedPredictionCard
                key={`compact-${prediction.id}`}
                prediction={prediction}
                variant="compact"
                onPredict={handlePredict}
                maxVisibleOptions={2}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Prediction Placement Modal */}
      <PredictionPlacementModal
        prediction={selectedPrediction || samplePredictions[0]}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlacePrediction={handlePlacePrediction}
        userBalance={2500}
        preselectedOptionId=""
      />
    </div>
  );
};

export default EnhancedDiscoverPage;