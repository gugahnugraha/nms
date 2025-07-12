import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-6 w-6',
    large: 'h-8 w-8',
    xlarge: 'h-12 w-12'
  };

  return (
    <Loader2 className={`animate-spin text-primary-500 ${sizeClasses[size]} ${className}`} />
  );
};

export default LoadingSpinner;
