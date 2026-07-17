import React, { useState, useRef, useEffect } from "react";
import LucideIcon from "./LucideIcon";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageFile: File | null;
  aspectRatio: number; // e.g. 1 for avatar (square), 3.2 for banner
  title?: string;
  onClose: () => void;
  onConfirm: (croppedFile: File) => void;
}

export default function ImageCropperModal({
  isOpen,
  imageFile,
  aspectRatio,
  title = "Cắt ảnh trước khi tải lên",
  onClose,
  onConfirm,
}: ImageCropperModalProps) {
  if (!isOpen || !imageFile) return null;

  const [imageUrl, setImageUrl] = useState<string>("");
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Setup object URL for file
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Handle image load to get natural dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  // Dimensions of the display area
  const containerWidth = 400;
  const containerHeight = 300;

  // Calculate mask size based on aspect ratio
  let maskWidth = 260;
  let maskHeight = 260;

  if (aspectRatio > 1) {
    maskWidth = 340;
    maskHeight = Math.round(maskWidth / aspectRatio);
  } else if (aspectRatio < 1) {
    maskHeight = 220;
    maskWidth = Math.round(maskHeight * aspectRatio);
  }

  const maskX = (containerWidth - maskWidth) / 2;
  const maskY = (containerHeight - maskHeight) / 2;

  // Calculate base scale to cover the mask
  let baseScale = 1;
  if (imgDimensions.width > 0 && imgDimensions.height > 0) {
    baseScale = Math.max(
      maskWidth / imgDimensions.width,
      maskHeight / imgDimensions.height,
    );
  }

  const currentScale = baseScale * zoom;
  const displayedWidth = imgDimensions.width * currentScale;
  const displayedHeight = imgDimensions.height * currentScale;

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    // Bounds constraint: prevent dragging image past the borders of the mask
    // Center of image on screen is (containerWidth / 2 + newX)
    // Left boundary of image is center - displayedWidth / 2
    // Must be <= maskX
    const maxLeft = maskX;
    const minLeft = maskX + maskWidth - displayedWidth;

    const maxTop = maskY;
    const minTop = maskY + maskHeight - displayedHeight;

    // Adjust offsets relative to center
    // Centered left on screen is containerWidth / 2 - displayedWidth / 2
    const centerLeft = (containerWidth - displayedWidth) / 2;
    const centerTop = (containerHeight - displayedHeight) / 2;

    const currentLeft = centerLeft + newX;
    const currentTop = centerTop + newY;

    if (displayedWidth >= maskWidth) {
      if (currentLeft > maxLeft) {
        newX = maxLeft - centerLeft;
      } else if (currentLeft < minLeft) {
        newX = minLeft - centerLeft;
      }
    } else {
      newX = 0;
    }

    if (displayedHeight >= maskHeight) {
      if (currentTop > maxTop) {
        newY = maxTop - centerTop;
      } else if (currentTop < minTop) {
        newY = minTop - centerTop;
      }
    } else {
      newY = 0;
    }

    setOffset({ x: newX, y: newY });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    let newX = touch.clientX - dragStart.x;
    let newY = touch.clientY - dragStart.y;

    const maxLeft = maskX;
    const minLeft = maskX + maskWidth - displayedWidth;
    const maxTop = maskY;
    const minTop = maskY + maskHeight - displayedHeight;

    const centerLeft = (containerWidth - displayedWidth) / 2;
    const centerTop = (containerHeight - displayedHeight) / 2;

    const currentLeft = centerLeft + newX;
    const currentTop = centerTop + newY;

    if (displayedWidth >= maskWidth) {
      if (currentLeft > maxLeft) {
        newX = maxLeft - centerLeft;
      } else if (currentLeft < minLeft) {
        newX = minLeft - centerLeft;
      }
    } else {
      newX = 0;
    }

    if (displayedHeight >= maskHeight) {
      if (currentTop > maxTop) {
        newY = maxTop - centerTop;
      } else if (currentTop < minTop) {
        newY = minTop - centerTop;
      }
    } else {
      newY = 0;
    }

    setOffset({ x: newX, y: newY });
  };

  const handleCrop = () => {
    if (!imgRef.current) return;

    // Output high-quality canvas (x2 zoom)
    const outputScale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = maskWidth * outputScale;
    canvas.height = maskHeight * outputScale;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Calculate position of the image relative to the mask on screen
    const centerLeft = (containerWidth - displayedWidth) / 2;
    const centerTop = (containerHeight - displayedHeight) / 2;

    const leftRelativeToMask = centerLeft + offset.x - maskX;
    const topRelativeToMask = centerTop + offset.y - maskY;

    // Map screen-relative size and positions to canvas dimensions
    const scaleRatio = (maskWidth * outputScale) / maskWidth;

    const drawX = leftRelativeToMask * scaleRatio;
    const drawY = topRelativeToMask * scaleRatio;
    const drawW = displayedWidth * scaleRatio;
    const drawH = displayedHeight * scaleRatio;

    // Draw image onto canvas
    ctx.drawImage(imgRef.current, drawX, drawY, drawW, drawH);

    // Convert canvas to File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], imageFile.name, {
            type: imageFile.type || "image/png",
            lastModified: Date.now(),
          });
          onConfirm(croppedFile);
        }
      },
      imageFile.type || "image/png",
      0.92,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 ">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100  flex justify-between items-center bg-slate-50 ">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <LucideIcon name="Crop" className="text-indigo-500" size={16} />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
          >
            <LucideIcon name="X" size={16} />
          </button>
        </div>

        {/* Workspace */}
        <div className="p-5 flex flex-col items-center">
          <div
            ref={containerRef}
            className="relative overflow-hidden bg-slate-950 rounded-md shadow-inner select-none cursor-grab active:cursor-grabbing"
            style={{ width: containerWidth, height: containerHeight }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
          >
            {/* The Image */}
            {imageUrl && (
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Source"
                className="absolute pointer-events-none origin-center"
                style={{
                  width: displayedWidth,
                  height: displayedHeight,
                  left: (containerWidth - displayedWidth) / 2 + offset.x,
                  top: (containerHeight - displayedHeight) / 2 + offset.y,
                }}
                onLoad={handleImageLoad}
              />
            )}

            {/* SVG Overlaid Mask */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: "normal" }}
            >
              <defs>
                <mask id="cropper-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {aspectRatio === 1 ? (
                    // Circle mask for Avatar
                    <circle
                      cx={containerWidth / 2}
                      cy={containerHeight / 2}
                      r={maskWidth / 2}
                      fill="black"
                    />
                  ) : (
                    // Rectangle mask for banner
                    <rect
                      x={maskX}
                      y={maskY}
                      width={maskWidth}
                      height={maskHeight}
                      rx="8"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              {/* Semi-transparent backdrop with a hole in the center */}
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#cropper-mask)"
              />
              {/* Target outline */}
              {aspectRatio === 1 ? (
                <circle
                  cx={containerWidth / 2}
                  cy={containerHeight / 2}
                  r={maskWidth / 2}
                  stroke="rgba(255, 255, 255, 0.75)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="none"
                />
              ) : (
                <rect
                  x={maskX}
                  y={maskY}
                  width={maskWidth}
                  height={maskHeight}
                  rx="8"
                  stroke="rgba(255, 255, 255, 0.75)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="none"
                />
              )}
            </svg>
          </div>

          <p className="text-[11px] text-slate-400  mt-2 text-center">
            Kéo và thả để di chuyển ảnh khớp với vùng chọn
          </p>

          {/* Controls */}
          <div className="w-full mt-4 space-y-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <LucideIcon name="ZoomOut" className="text-slate-400" size={14} />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
              <LucideIcon name="ZoomIn" className="text-slate-400" size={14} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50  border-t border-slate-100  flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className="px-4 py-2 rounded text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <LucideIcon name="Check" size={14} />
            Cắt & Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
