import React, { useState } from 'react';
import { Camera, Download, Eye } from 'lucide-react';
import ReactDOM from 'react-dom';

// Modal Portal Component
const Modal = ({ children, onClose }) => {
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 9999 }} // Very high z-index to ensure it's above everything
      onClick={onClose}
    >
      {children}
    </div>,
    document.body // Mount directly to body to avoid stacking context issues
  );
};

const EnhancedImage = ({ src, alt }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = alt || 'image';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    setIsPreview(true);
  };

  return (
    <div className="relative">
      {/* Thumbnail View */}
      <div 
        className="relative w-14 h-14"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={src || "/api/placeholder/56/56"}
          alt={alt}
          className={`w-full h-full rounded object-cover cursor-pointer transition-all duration-300 ${
            isHovered ? 'scale-110 shadow-lg' : ''
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />
        
        {isHovered && (
          <div className="absolute inset-0 flex justify-center items-center gap-2 bg-black/40 rounded transition-opacity duration-200">
            <button
              onClick={handlePreview}
              className="p-1 text-white bg-white/10 rounded backdrop-blur-sm hover:bg-white/20 hover:scale-110 transition-all duration-200"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={handleDownload}
              className="p-1 text-white bg-white/10 rounded backdrop-blur-sm hover:bg-white/20 hover:scale-110 transition-all duration-200"
            >
              <Download size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {isPreview && (
        <Modal onClose={() => setIsPreview(false)}>
          <div 
            className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-gray-100">
              <img
                src={src || "/api/placeholder/800/600"}
                alt={alt}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <button
                onClick={() => setIsPreview(false)}
                className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              >
                <Eye size={20} />
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">{alt}</h3>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Zoomed Modal */}
      {isZoomed && (
        <Modal onClose={() => setIsZoomed(false)}>
          <div 
            className="relative w-full h-full max-w-7xl max-h-[80vh] bg-gray-100 rounded-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={src || "/api/placeholder/800/600"}
              alt={alt}
              className="w-full h-full object-contain"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EnhancedImage;