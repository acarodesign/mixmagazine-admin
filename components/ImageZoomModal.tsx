import React from 'react';

interface ImageZoomModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative max-w-4xl max-h-[90vh]"
        style={{ animation: 'zoomIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards' }}
      >
        <img
          src={imageUrl}
          alt="Visualização ampliada do produto"
          className="w-full h-full object-contain rounded-lg shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 text-white bg-gray-800/80 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white transition-all transform hover:rotate-90"
          aria-label="Fechar"
        >
          &times;
        </button>
      </div>
      <style>{`
        @keyframes zoomIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ImageZoomModal;
