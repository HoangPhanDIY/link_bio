import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import LucideIcon from "./LucideIcon";

interface BannerSlideshowProps {
  images: string[];
  autoplayInterval?: number; // defaults to 5000ms
  className?: string;
}

export default function BannerSlideshow({
  images,
  autoplayInterval = 5000,
  className = "h-40 sm:h-56 md:h-64 w-full",
}: BannerSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto scroll effect
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, autoplayInterval);

    return () => clearInterval(interval);
  }, [images, autoplayInterval]);

  // Adjust index if images array changes and current index is out of bounds
  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(0);
    }
  }, [images, currentIndex]);

  if (!images || images.length === 0) {
    return (
      <div
        className={`${className} bg-slate-900 flex items-center justify-center text-slate-500 rounded-md`}
      >
        <LucideIcon name="Image" size={32} />
      </div>
    );
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length,
    );
  };

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex(index);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-md sm:rounded-3xl shadow-md group ${className}`}
    >
      {/* Slides with AnimatePresence */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Banner slide ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 0.95, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none"></div>
      </div>

      {/* Navigation Buttons (Fade in on hover) */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
            aria-label="Previous banner"
          >
            <LucideIcon name="ChevronLeft" size={18} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
            aria-label="Next banner"
          >
            <LucideIcon name="ChevronRight" size={18} />
          </button>
        </>
      )}

      {/* Slide Indicators / Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => handleDotClick(idx, e)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-4 bg-white"
                  : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
