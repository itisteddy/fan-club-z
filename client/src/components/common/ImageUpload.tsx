import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  selectedImage?: File | null;
  imagePreview?: string | null;
  disabled?: boolean;
  maxSize?: number; // in MB
  className?: string;
  variant?: 'button' | 'dropzone' | 'inline';
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onImageRemove,
  selectedImage,
  imagePreview,
  disabled = false,
  maxSize = 5,
  className = '',
  variant = 'button'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return false;
    }
    
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      onImageSelect(file);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Button variant (for comment input, etc.)
  if (variant === 'button') {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={disabled}
          className={`p-2 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 ${className}`}
          title="Attach image"
        >
          <ImageIcon size={18} />
        </button>
      </>
    );
  }

  // Dropzone variant (for prediction creation, etc.)
  if (variant === 'dropzone') {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div
          onClick={triggerFileInput}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : selectedImage 
                ? 'border-slate-300 bg-slate-50' 
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
        >
          {selectedImage && imagePreview ? (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-48 mx-auto rounded-lg object-cover shadow-sm"
              />
              {onImageRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageRemove();
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Upload size={24} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {isDragOver ? 'Drop image here' : 'Click to upload image'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PNG, JPG up to {maxSize}MB
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // Inline variant (for forms, etc.)
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div className={`flex items-center gap-3 ${className}`}>
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ImageIcon size={16} />
          Upload Image
        </button>
        
        {selectedImage && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="truncate max-w-32">{selectedImage.name}</span>
            {onImageRemove && (
              <button
                onClick={onImageRemove}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ImageUpload;
