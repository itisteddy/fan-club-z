import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles, Target, Wallet, Compass, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    id: 'discover',
    title: 'Discover predictions',
    icon: <Compass className="w-5 h-5" />,
    description: 'Explore live markets and trending predictions tailored for you.'
  },
  {
    id: 'create',
    title: 'Create your own',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Post a prediction, set options and invite the community.'
  },
  {
    id: 'bets',
    title: 'Track My Bets',
    icon: <Target className="w-5 h-5" />,
    description: 'See Active, Created and Completed predictions in one place.'
  },
  {
    id: 'wallet',
    title: 'Manage your wallet',
    icon: <Wallet className="w-5 h-5" />,
    description: 'View balance and transactions. Your data persists across sessions.'
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [index, setIndex] = React.useState(0);

  const next = () => {
    if (index < steps.length - 1) setIndex(index + 1);
    else onClose();
  };

  const skip = () => onClose();

  const step = steps[index];

  if (!step) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[12000] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={skip}
          />

          {/* Sheet / Modal */}
          <motion.div
            className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gradient-to-r from-purple-500 to-teal-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Welcome to Fan Club Z</span>
              </div>
              <button onClick={skip} className="p-1 rounded hover:bg-white/10" aria-label="Close onboarding">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mt-4">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i <= index ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                    style={{ width: i === index ? 40 : 20 }}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={skip}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-medium hover:bg-gray-200"
                >
                  Skip
                </button>
                <button
                  onClick={next}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-medium hover:bg-emerald-700"
                >
                  {index === steps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;


