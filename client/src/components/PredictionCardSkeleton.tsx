import React from 'react';

const PredictionCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-4 mx-4 mb-3 shadow-sm border border-gray-100 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Options skeleton */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 border-2 border-gray-200 rounded-xl">
            <div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-8"></div>
          </div>
          <div className="p-3 border-2 border-gray-200 rounded-xl">
            <div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-8"></div>
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="flex items-center justify-between text-sm mb-4">
        <div className="flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded w-12"></div>
          <div className="h-4 bg-gray-200 rounded w-8"></div>
          <div className="h-4 bg-gray-200 rounded w-10"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>

      {/* Actions skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded w-8"></div>
          <div className="h-4 bg-gray-200 rounded w-8"></div>
          <div className="h-4 bg-gray-200 rounded w-6"></div>
        </div>
        <div className="w-20 h-8 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
};

export default PredictionCardSkeleton;
