import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Check, 
  Users, 
  Lock, 
  Globe, 
  Settings,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scrollToTop } from '../utils/scroll';

interface CreateClubPageProps {
  onNavigateBack?: () => void;
}

const CreateClubPage: React.FC<CreateClubPageProps> = ({ onNavigateBack }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Scroll to top when component mounts
  React.useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  // Scroll to top when step changes
  React.useEffect(() => {
    scrollToTop({ behavior: 'smooth' });
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    } else if (onNavigateBack) {
      onNavigateBack();
    }
  }, [step, onNavigateBack]);

  const validateStep = useCallback((currentStep: number) => {
    switch (currentStep) {
      case 1:
        if (!name.trim()) {
          toast.error('Please enter a club name');
          return false;
        }
        if (name.trim().length < 3) {
          toast.error('Club name must be at least 3 characters');
          return false;
        }
        if (!category) {
          toast.error('Please select a category');
          return false;
        }
        return true;
      case 2:
        if (!description.trim()) {
          toast.error('Please enter a description');
          return false;
        }
        if (description.trim().length < 10) {
          toast.error('Description must be at least 10 characters');
          return false;
        }
        return true;
      default:
        return true;
    }
  }, [name, category, description]);

  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      if (step < 3) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }
  }, [step, validateStep]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Creating club with data:', {
        name,
        description,
        category,
        privacy
      });

      toast.success('🎉 Club created successfully!');
      setSubmitSuccess(true);
      
      // Navigate back after success
      setTimeout(() => {
        // Reset form
        setStep(1);
        setName('');
        setDescription('');
        setCategory('');
        setPrivacy('public');
        setSubmitSuccess(false);
        setIsSubmitting(false);
        
        // Navigate back
        if (onNavigateBack) {
          onNavigateBack();
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to create club:', error);
      toast.error('Failed to create club. Please try again.');
      setIsSubmitting(false);
    }
  }, [name, description, category, privacy, step, validateStep, onNavigateBack]);

  // Success View
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 text-center shadow-2xl border border-purple-200"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
            className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check size={32} className="text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Club Created!</h2>
          <p className="text-gray-600 mb-4">Your club has been successfully created and is now live.</p>
          <div className="text-sm text-purple-600 font-medium">Redirecting to clubs...</div>
        </motion.div>
      </div>
    );
  }

  const categories = [
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { id: 'crypto', label: 'Crypto', icon: '₿' },
    { id: 'politics', label: 'Politics', icon: '🗳️' },
    { id: 'tech', label: 'Technology', icon: '💻' },
    { id: 'custom', label: 'Custom', icon: '🎯' }
  ];

  const privacyOptions = [
    { id: 'public', label: 'Public', description: 'Anyone can find and join', icon: Globe },
    { id: 'private', label: 'Private', description: 'Only invited members can join', icon: Lock }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-600" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-purple-600/10" />
        
        {/* Animated elements */}
        <div className="absolute top-0 right-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 px-6 pt-14 pb-8">
          <div className="flex items-center gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft size={20} />
            </motion.button>
            
            <div>
              <h1 className="text-3xl font-bold text-white">Create Club</h1>
              <p className="text-purple-100">Step {step} of 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
        >
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
              
              {/* Club Name */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Club Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter club name..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCategory(cat.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        category === cat.id
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{cat.icon}</div>
                      <div className="font-semibold">{cat.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Description */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Club Description</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what your club is about, what kind of predictions you'll make, and who should join..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                <div className="text-sm text-gray-500 mt-2">
                  {description.length}/500 characters
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Privacy Settings */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy Settings</h2>
              
              <div className="space-y-4">
                {privacyOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <motion.button
                      key={option.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPrivacy(option.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        privacy === option.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={24} className={privacy === option.id ? 'text-purple-600' : 'text-gray-600'} />
                        <div>
                          <div className={`font-semibold ${privacy === option.id ? 'text-purple-700' : 'text-gray-700'}`}>
                            {option.label}
                          </div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Back
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : step === 3 ? (
                'Create Club'
              ) : (
                'Next'
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateClubPage; 