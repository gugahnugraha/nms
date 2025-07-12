import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  confirmButtonClass = 'btn-primary',
  onConfirm, 
  onCancel,
  isLoading = false,
  hideCancelButton = false,
  overlayClosable = false,
  backdrop = true
}) => {
  const handleOverlayClick = (e) => {
    // Only close if clicking directly on the overlay, not its children
    if (overlayClosable && e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-orange-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-gray-700">{message}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          {!hideCancelButton && onCancel && (
            <button
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`btn ${confirmButtonClass}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
