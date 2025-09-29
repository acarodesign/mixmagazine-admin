import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const baseClasses = 'fixed top-5 right-5 p-4 rounded-xl shadow-2xl text-white flex items-center justify-between z-50 border-l-4 animate-fade-in';
  const typeClasses = {
    success: 'bg-green-600/80 backdrop-blur-sm border-green-400',
    error: 'bg-red-600/80 backdrop-blur-sm border-red-400',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <span className="mr-4">{message}</span>
      <button onClick={onClose} className="font-bold text-xl leading-none hover:text-gray-200 transition-colors">&times;</button>
    </div>
  );
};

export default Toast;
