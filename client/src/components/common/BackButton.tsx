import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function BackButton() {
  const navigate = useNavigate();
  
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => navigate(-1)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}

export default BackButton;
