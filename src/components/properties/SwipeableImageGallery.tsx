import React, { useState, useRef, useEffect, TouchEvent } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  Sparkles, 
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { PropertyMedia } from '../../types';

interface SwipeableImageGalleryProps {
  media?: PropertyMedia[];
  images?: PropertyMedia[];
  title: string;
  badgeText?: string;
  badgeBg?: string;
  aspectRatio?: string;
  onOpenLightbox?: (index: number) => void;
  className?: string;
  showThumbnails?: boolean;
}

export const SwipeableImageGallery: React.FC<SwipeableImageGalleryProps> = ({
  media,
  images: propImages,
  title,
  badgeText,
  badgeBg = 'bg-rose-600',
  aspectRatio = 'aspect-[16/10]',
  onOpenLightbox,
  className = '',
  showThumbnails = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const rawList = media || propImages || [];
  const images = rawList.length > 0 ? rawList : [
    { id: '1', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80', isCover: true, order: 1, mediaType: 'image' as const }
  ];

  const minSwipeDistance = 45;

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }
  };

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openFullscreen = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onOpenLightbox) {
      onOpenLightbox(idx);
    } else {
      setIsLightboxOpen(true);
    }
  };

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, images.length]);

  return (
    <div className={`relative flex flex-col gap-3 ${className}`}>
      {/* Main Image Container */}
      <div 
        className={`relative ${aspectRatio} w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 shadow-md select-none touch-pan-y`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentIndex]?.url || images[0]?.url}
          alt={`${title} - Foto ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300 pointer-events-none"
          loading="lazy"
        />

        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

        {/* Badge */}
        {badgeText && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg ${badgeBg} text-white shadow-lg`}>
              {badgeText}
            </span>
          </div>
        )}

        {/* Photo Counter Badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{currentIndex + 1} / {images.length}</span>
          </span>

          <button
            type="button"
            onClick={(e) => openFullscreen(currentIndex, e)}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            title="Ver tela cheia"
            aria-label="Ver fotos em tela cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Previous / Next Arrow Buttons (Desktop & Tablet) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-90 cursor-pointer shadow-lg hidden sm:flex"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-90 cursor-pointer shadow-lg hidden sm:flex"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Mobile Swipe Pagination Indicator Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:hidden">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex 
                    ? 'w-6 bg-rose-500' 
                    : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails Row (Tablet & Desktop) */}
      {showThumbnails && images.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-16 sm:w-20 aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-rose-600 scale-105 shadow-md ring-2 ring-rose-500/20'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img.thumbnailUrl || img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10">
            <div>
              <h3 className="font-bold text-sm sm:text-base font-['Outfit'] truncate max-w-md">{title}</h3>
              <p className="text-xs text-slate-400">Foto {currentIndex + 1} de {images.length}</p>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Fechar galeria"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Image with Touch Swipe */}
          <div 
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={images[currentIndex]?.url || images[0]?.url}
              alt={`${title} - Foto ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain select-none rounded-xl"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 sm:left-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 sm:right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-2">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative flex-shrink-0 w-12 sm:w-16 aspect-[16/10] rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex ? 'border-rose-500 scale-110' : 'border-white/20 opacity-50'
                }`}
              >
                <img src={img.thumbnailUrl || img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
