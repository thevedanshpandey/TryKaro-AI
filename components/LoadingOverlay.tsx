
import React from 'react';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Generating your look..." }) => {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-neon/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-neon rounded-full border-t-transparent animate-spin"></div>
        <img src="https://api.iconify.design/fluent-emoji:sparkles.svg" className="absolute inset-0 m-auto w-10 h-10 animate-pulse" alt="sparkle" />
      </div>
      <h3 className="text-xl font-bold text-white animate-pulse">{message}</h3>
      <p className="text-gray-400 mt-2 text-sm">Styling you to perfection...</p>
    </div>
  );
};
