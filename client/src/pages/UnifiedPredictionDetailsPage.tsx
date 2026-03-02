import React, { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { usePredictionStore } from '../store/predictionStore';
import { buildPredictionCanonicalUrl } from '@/lib/predictionUrls';
import { getPredictionStatusUi } from '@/lib/predictionStatusUi';
import Header from '../components/layout/Header/Header';
import Page from '../components/ui/layout/Page';
import Card, { CardHeader, CardContent } from '../components/ui/card/Card';
import { SkeletonCard } from '../components/ui/skeleton/Skeleton';

interface UnifiedPredictionDetailsPageProps {
  predictionId?: string;
  onNavigateBack?: () => void;
}

const UnifiedPredictionDetailsPage: React.FC<UnifiedPredictionDetailsPageProps> = ({ 
  predictionId, 
  onNavigateBack 
}) => {
  const { predictions, fetchPredictions, loading } = usePredictionStore();
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    if (predictionId) {
      // Find prediction in store or fetch if needed
      const foundPrediction = predictions.find(p => p.id === predictionId);
      if (foundPrediction) {
        setPrediction(foundPrediction);
      } else {
        fetchPredictions(); // This would fetch all predictions; in a real app you'd fetch by ID
      }
    }
  }, [predictionId, predictions, fetchPredictions]);

  const handleShare = () => {
    if (navigator.share && prediction && predictionId) {
      const shareUrl = buildPredictionCanonicalUrl(predictionId, prediction.title || prediction.question);
      navigator.share({
        title: prediction.question,
        url: shareUrl,
      }).catch(console.error);
    }
  };

  return (
    <>
      <Header 
        title={prediction?.question || 'Prediction Details'}
        back={true}
        onBack={onNavigateBack}
        trailing={
          <button
            onClick={handleShare}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Share prediction"
          >
            <Share2 className="w-5 h-5" />
          </button>
        }
      />
      
      <Page>
        {loading || !prediction ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Prediction Details Card */}
            <Card>
              <CardHeader title="Prediction Details" />
              <CardContent>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {prediction.question}
                </h2>
                
                {prediction.description && (
                  <p className="text-gray-600 mb-4">
                    {prediction.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <span className="ml-2 font-medium">{prediction.category || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    {(() => {
                      const statusUi = getPredictionStatusUi({
                        status: prediction.status,
                        settledAt: prediction.settledAt || prediction.settled_at,
                        closedAt: prediction.closedAt || prediction.closed_at,
                      });
                      return (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusUi.tone === 'success' ? 'bg-green-100 text-green-800' :
                          statusUi.tone === 'warning' ? 'bg-amber-100 text-amber-800' :
                          statusUi.tone === 'danger' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {statusUi.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 font-medium">
                      {new Date(prediction.created_at || 0).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Deadline:</span>
                    <span className="ml-2 font-medium">
                      {prediction.deadline_date 
                        ? new Date(prediction.deadline_date).toLocaleDateString()
                        : 'Not set'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options Card */}
            {prediction.options && prediction.options.length > 0 && (
              <Card>
                <CardHeader title="Options" />
                <CardContent>
                  <div className="space-y-3">
                    {prediction.options.map((option: any, index: number) => (
                      <div key={index} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{option.text || `Option ${index + 1}`}</span>
                          {option.odds && (
                            <span className="text-sm text-gray-600">{option.odds}x</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments/Activity Card */}
            <Card>
              <CardHeader title="Activity" />
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <p>Comments and activity will appear here.</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </Page>
    </>
  );
};

export default UnifiedPredictionDetailsPage;
