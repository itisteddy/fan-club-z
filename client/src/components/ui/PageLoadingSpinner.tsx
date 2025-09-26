import React from 'react';
import { motion } from 'framer-motion';

const PageLoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

export default PageLoadingSpinner;
