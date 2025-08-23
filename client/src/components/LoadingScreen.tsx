import React from 'react';
import Logo from './common/Logo';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-8 px-4">
      {/* Logo with Animation */}
      <div className="relative">
        {/* Pulse Ring Animation */}
        <div className="absolute inset-0 rounded-full bg-green-200 animate-pulse-ring" />
        <div className="absolute inset-2 rounded-full bg-teal-100 animate-pulse-ring" style={{ animationDelay: '0.15s' }} />
        
        {/* Main Logo */}
        <div className="relative animate-bounce-subtle">
          <Logo size="xl" variant="icon" />
        </div>
      </div>

      {/* Brand Text */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Fan Club Z</h1>
        <p className="text-sm text-gray-600">
          Building the future of predictions
        </p>
      </div>

      {/* Loading Indicator */}
      <div className="space-y-3">
        <div className="flex justify-center">
          <div className="loading-spinner w-6 h-6 border-teal-500" />
        </div>
        <div className="text-xs text-gray-500 text-center">
          Loading...
        </div>
      </div>

      {/* Progress Steps (Optional) */}
      <div className="space-y-4 w-full max-w-xs">
        <LoadingStep label="Connecting to network" completed />
        <LoadingStep label="Loading your data" active />
        <LoadingStep label="Preparing predictions" />
      </div>
    </div>
  );
};

interface LoadingStepProps {
  label: string;
  completed?: boolean;
  active?: boolean;
}

const LoadingStep: React.FC<LoadingStepProps> = ({ label, completed, active }) => {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
        completed 
          ? 'bg-teal-500' 
          : active 
          ? 'bg-teal-500 animate-pulse' 
          : 'bg-gray-300'
      }`} />
      <span className={`text-xs transition-colors duration-300 ${
        completed 
          ? 'text-teal-600' 
          : active 
          ? 'text-gray-900' 
          : 'text-gray-500'
      }`}>
        {label}
      </span>
    </div>
  );
};

// Alternative minimal loading screen
export const MinimalLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <span className="text-xl font-bold text-white">F</span>
        </div>
        <div className="loading-spinner w-8 h-8 border-teal-500 mx-auto" />
      </div>
    </div>
  );
};

// Skeleton loading for content
export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`skeleton ${className}`} />
  );
};

// Card skeleton for prediction cards
export const PredictionCardSkeleton: React.FC = () => {
  return (
    <div className="prediction-card p-5 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <SkeletonLoader className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <SkeletonLoader className="h-4 w-32" />
          <SkeletonLoader className="h-3 w-24" />
        </div>
      </div>

      {/* Title skeleton */}
      <div className="space-y-2">
        <SkeletonLoader className="h-5 w-full" />
        <SkeletonLoader className="h-5 w-3/4" />
      </div>

      {/* Options skeleton */}
      <div className="grid grid-cols-2 gap-2">
        <SkeletonLoader className="h-16 rounded-lg" />
        <SkeletonLoader className="h-16 rounded-lg" />
      </div>

      {/* Stats skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <SkeletonLoader className="h-4 w-12" />
          <SkeletonLoader className="h-4 w-16" />
        </div>
        <SkeletonLoader className="h-4 w-20" />
      </div>
    </div>
  );
};

// List skeleton
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <PredictionCardSkeleton key={index} />
      ))}
    </div>
  );
};
