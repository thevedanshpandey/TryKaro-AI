
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { Icons } from '../constants';

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

export const ImageCropper: React.FC<Props> = ({ imageSrc, onCancel, onCropComplete }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants
  const CROP_SIZE = 280; // The visual size of the crop box
  const OUTPUT_SIZE = 500; // The resolution of the saved image

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const executeCrop = () => {
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    if (ctx && img && containerRef.current) {
      // Logic to map the visual CSS transform to the Canvas draw
      // 1. Calculate the scale difference between the rendered image and natural image
      const renderedWidth = img.width * zoom;
      const renderedHeight = img.height * zoom;
      
      // Center point logic
      const cx = (renderedWidth) / 2 + offset.x;
      const cy = (renderedHeight) / 2 + offset.y;

      // Draw onto the 500x500 canvas
      // We essentially want to "take a picture" of the center of the container
      
      // Calculate source x/y in the natural image
      // The container center is (containerWidth/2, containerHeight/2)
      // The image is shifted by offset.x, offset.y and scaled by zoom
      
      // Simplified: We draw the image centered on the canvas, applying zoom and offset
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      
      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.translate(offset.x * (OUTPUT_SIZE / CROP_SIZE), offset.y * (OUTPUT_SIZE / CROP_SIZE));
      ctx.scale(zoom * (OUTPUT_SIZE / CROP_SIZE), zoom * (OUTPUT_SIZE / CROP_SIZE));
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      onCropComplete(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4">
      <h3 className="text-white font-bold text-xl mb-4">Adjust Photo</h3>
      
      <div 
        className="relative overflow-hidden bg-gray-900 rounded-full border-4 border-neon shadow-[0_0_30px_rgba(255,42,109,0.3)] cursor-move touch-none"
        style={{ width: CROP_SIZE, height: CROP_SIZE }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        ref={containerRef}
      >
        <img 
          ref={imageRef}
          src={imageSrc}
          alt="Crop target"
          draggable={false}
          className="absolute max-w-none origin-center transition-none select-none"
          style={{ 
            left: '50%', 
            top: '50%',
            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            minWidth: '100%',
            minHeight: '100%'
          }}
        />
        {/* Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
             <div className="w-full h-full border border-white/50 rounded-full"></div>
             <div className="absolute top-1/2 left-0 w-full h-px bg-white/30"></div>
             <div className="absolute left-1/2 top-0 w-px h-full bg-white/30"></div>
        </div>
      </div>

      <div className="w-full max-w-xs mt-8 space-y-6">
        <div>
            <label className="text-xs text-gray-400 mb-2 flex justify-between">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
            </label>
            <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-neon h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        
        <div className="flex gap-4">
            <Button variant="secondary" onClick={onCancel} fullWidth>Cancel</Button>
            <Button onClick={executeCrop} fullWidth>Done</Button>
        </div>
      </div>
      
      <p className="text-gray-500 text-xs mt-4">Drag to pan • Slider to zoom</p>
    </div>
  );
};
