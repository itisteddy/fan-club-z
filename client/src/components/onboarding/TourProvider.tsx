import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import GuidedTour from './GuidedTour';

export interface TourStep {
  id: string;
  target: string; // data-tour-id value
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  onNext?: () => Promise<void> | void; // for cross-page navigation
}

interface TourContextValue {
  isOpen: boolean;
  steps: TourStep[];
  index: number;
  startTour: (steps: TourStep[]) => void;
  stopTour: () => void;
  next: () => void;
  prev: () => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const busyRef = useRef(false);

  const startTour = (newSteps: TourStep[]) => {
    setSteps(newSteps);
    setIndex(0);
    setIsOpen(true);
  };

  const stopTour = () => {
    setIsOpen(false);
    setSteps([]);
    setIndex(0);
  };

  const next = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const step = steps[index];
    try {
      if (step?.onNext) {
        await step.onNext();
        // wait a tick for DOM to update on navigation
        await new Promise(res => setTimeout(res, 250));
      }
      if (index < steps.length - 1) setIndex(i => i + 1);
      else stopTour();
    } finally {
      busyRef.current = false;
    }
  };

  const prev = () => setIndex(i => Math.max(0, i - 1));

  const value = useMemo(() => ({ isOpen, steps, index, startTour, stopTour, next, prev }), [isOpen, steps, index]);

  return (
    <TourContext.Provider value={value}>
      {children}
      <GuidedTour isOpen={isOpen} steps={steps} index={index} onClose={stopTour} onNext={next} onPrev={prev} />
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
};

export default TourProvider;


