import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  ZoomIn, 
  ZoomOut, 
  Sliders, 
  Crop as CropIcon, 
  Check, 
  RefreshCw, 
  Sparkles,
  Maximize2,
  Minimize2,
  Sun,
  Contrast as ContrastIcon,
  Palette,
  Thermometer,
  Layers
} from 'lucide-react';
import { 
  ImageAdjustments, 
  processAndCompressImage, 
  ProcessedImageResult,
  loadImage 
} from '../../lib/imageProcessing';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  onSave: (processed: ProcessedImageResult) => void;
}

type AspectRatio = 'free' | '16:9' | '4:3' | '1:1';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'foto-imovel.jpg',
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'crop' | 'adjust' | 'transform'>('crop');
  
  // Adjustments State
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [warmth, setWarmth] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Canvas references for live rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });

  // Load image on modal open
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    setImageLoaded(false);
    loadImage(imageUrl)
      .then((img) => {
        originalImageRef.current = img;
        setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load image into editor:', err);
      });

    // Reset controls
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1.0);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
  }, [isOpen, imageUrl]);

  // Redraw canvas whenever adjustments change
  useEffect(() => {
    if (!imageLoaded || !originalImageRef.current || !canvasRef.current) return;

    const img = originalImageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    // Determine crop window based on aspect ratio
    let cropWidth = nw;
    let cropHeight = nh;

    if (aspectRatio === '16:9') {
      const targetRatio = 16 / 9;
      if (nw / nh > targetRatio) {
        cropWidth = nh * targetRatio;
        cropHeight = nh;
      } else {
        cropWidth = nw;
        cropHeight = nw / targetRatio;
      }
    } else if (aspectRatio === '4:3') {
      const targetRatio = 4 / 3;
      if (nw / nh > targetRatio) {
        cropWidth = nh * targetRatio;
        cropHeight = nh;
      } else {
        cropWidth = nw;
        cropHeight = nw / targetRatio;
      }
    } else if (aspectRatio === '1:1') {
      const minDim = Math.min(nw, nh);
      cropWidth = minDim;
      cropHeight = minDim;
    }

    const cropX = (nw - cropWidth) / 2;
    const cropY = (nh - cropHeight) / 2;

    const rot = rotation % 360;
    const isSwapped = rot === 90 || rot === 270;

    // Display canvas sizing (constrained for UI performance)
    const maxPreviewDim = 800;
    let previewW = cropWidth;
    let previewH = cropHeight;

    if (previewW > maxPreviewDim || previewH > maxPreviewDim) {
      if (previewW >= previewH) {
        previewH = Math.round((previewH * maxPreviewDim) / previewW);
        previewW = maxPreviewDim;
      } else {
        previewW = Math.round((previewW * maxPreviewDim) / previewH);
        previewH = maxPreviewDim;
      }
    }

    canvas.width = isSwapped ? previewH : previewW;
    canvas.height = isSwapped ? previewW : previewH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (rot !== 0) {
      ctx.rotate((rot * Math.PI) / 180);
    }

    const sX = flipH ? -1 : 1;
    const sY = flipV ? -1 : 1;
    ctx.scale(sX, sY);
    ctx.scale(zoom, zoom);

    // Filter
    if (!showOriginal) {
      const b = 100 + brightness;
      const c = 100 + contrast;
      const s = 100 + saturation;
      let filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
      if (warmth > 0) filter += ` sepia(${warmth * 0.3}%)`;
      else if (warmth < 0) filter += ` hue-rotate(${warmth * 0.4}deg)`;
      ctx.filter = filter;
    } else {
      ctx.filter = 'none';
    }

    const drawW = isSwapped ? canvas.height : canvas.width;
    const drawH = isSwapped ? canvas.width : canvas.height;

    ctx.drawImage(
      img,
      cropX, cropY, cropWidth, cropHeight,
      -drawW / 2, -drawH / 2, drawW, drawH
    );

    ctx.restore();
  }, [
    imageLoaded,
    rotation,
    flipH,
    flipV,
    zoom,
    brightness,
    contrast,
    saturation,
    warmth,
    aspectRatio,
    showOriginal
  ]);

  if (!isOpen) return null;

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev + 270) % 360);
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1.0);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
    setAspectRatio('16:9');
  };

  const handleSaveAndApply = async () => {
    if (!originalImageRef.current) return;
    setIsProcessing(true);

    try {
      const img = originalImageRef.current;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      let cropWidth = nw;
      let cropHeight = nh;

      if (aspectRatio === '16:9') {
        const targetRatio = 16 / 9;
        if (nw / nh > targetRatio) {
          cropWidth = nh * targetRatio;
          cropHeight = nh;
        } else {
          cropWidth = nw;
          cropHeight = nw / targetRatio;
        }
      } else if (aspectRatio === '4:3') {
        const targetRatio = 4 / 3;
        if (nw / nh > targetRatio) {
          cropWidth = nh * targetRatio;
          cropHeight = nh;
        } else {
          cropWidth = nw;
          cropHeight = nw / targetRatio;
        }
      } else if (aspectRatio === '1:1') {
        const minDim = Math.min(nw, nh);
        cropWidth = minDim;
        cropHeight = minDim;
      }

      const cropX = (nw - cropWidth) / 2;
      const cropY = (nh - cropHeight) / 2;

      const adjustments: ImageAdjustments = {
        rotation,
        flipH,
        flipV,
        zoom,
        brightness,
        contrast,
        saturation,
        warmth,
        crop: {
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight
        }
      };

      const result = await processAndCompressImage(imageUrl, adjustments, {
        maxDimension: 1920,
        quality: 0.85,
        outputType: 'image/webp'
      });

      onSave(result);
      onClose();
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-['Outfit']">
                Estúdio de Edição de Imagem
              </h3>
              <p className="text-xs text-slate-400">
                Recorte, ajuste, gire e comprima mantendo qualidade de alto padrão
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Restaurar valores padrão"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Editor Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          
          {/* Left Canvas Preview (8 cols) */}
          <div className="lg:col-span-8 p-6 flex flex-col items-center justify-center bg-slate-950/80 relative min-h-[340px]">
            
            {/* Live Canvas */}
            <div className="relative max-w-full max-h-[55vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[55vh] object-contain rounded-xl"
              />
            </div>

            {/* Compare Before / After Overlay Button */}
            <div className="absolute bottom-4 left-6 flex items-center gap-2">
              <button
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-xs font-bold text-slate-200 border border-slate-700 backdrop-blur-md shadow-lg select-none hover:bg-slate-800 transition-all cursor-pointer"
              >
                Segure para ver Original
              </button>
              {originalDimensions.width > 0 && (
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                  {originalDimensions.width} × {originalDimensions.height} px
                </span>
              )}
            </div>

            {/* Quick Rotate & Zoom Overlay Controls */}
            <div className="absolute bottom-4 right-6 flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-700 backdrop-blur-md shadow-lg">
              <button
                onClick={handleRotateLeft}
                title="Girar 90° Anti-horário"
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotateRight}
                title="Girar 90° Horário"
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-700 my-auto" />
              <button
                onClick={() => setFlipH(!flipH)}
                title="Espelhar Horizontal"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  flipH ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFlipV(!flipV)}
                title="Espelhar Vertical"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  flipV ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FlipVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Tools & Adjustments Panel (4 cols) */}
          <div className="lg:col-span-4 p-5 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 flex flex-col justify-between space-y-6">
            
            <div className="space-y-5">
              
              {/* Tool Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('crop')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'crop'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CropIcon className="w-3.5 h-3.5" />
                  <span>Proporção</span>
                </button>
                <button
                  onClick={() => setActiveTab('adjust')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'adjust'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Ajustes</span>
                </button>
                <button
                  onClick={() => setActiveTab('transform')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'transform'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Zoom & Pos</span>
                </button>
              </div>

              {/* Tab 1: Aspect Ratio / Crop */}
              {activeTab === 'crop' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
                      Proporção de Corte Imobiliário
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: '16:9', label: '16:9 Widescreen', desc: 'Ideal para Portal & Capa' },
                        { id: '4:3', label: '4:3 Fotografia', desc: 'Padrão Cômodos' },
                        { id: '1:1', label: '1:1 Quadrado', desc: 'Feed / Redes Sociais' },
                        { id: 'free', label: 'Original', desc: 'Sem corte de proporção' }
                      ].map((ratio) => (
                        <button
                          key={ratio.id}
                          onClick={() => setAspectRatio(ratio.id as AspectRatio)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            aspectRatio === ratio.id
                              ? 'border-rose-500 bg-rose-950/40 text-white ring-1 ring-rose-500'
                              : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{ratio.label}</div>
                          <div className="text-[10px] text-slate-500">{ratio.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                    <span className="font-bold text-slate-300 block">💡 Dica de Especialista:</span>
                    <span>Fotos na proporção 16:9 destacam 3x mais os detalhes da arquitetura em telas de smartphones e computadores.</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Adjustments (Sliders) */}
              {activeTab === 'adjust' && (
                <div className="space-y-4 animate-in fade-in">
                  
                  {/* Brightness */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Brilho</span>
                      </span>
                      <span className="font-mono text-slate-400">{brightness > 0 ? `+${brightness}` : brightness}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <ContrastIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Contraste</span>
                      </span>
                      <span className="font-mono text-slate-400">{contrast > 0 ? `+${contrast}` : contrast}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Palette className="w-3.5 h-3.5 text-rose-400" />
                        <span>Saturação / Cores</span>
                      </span>
                      <span className="font-mono text-slate-400">{saturation > 0 ? `+${saturation}` : saturation}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  {/* Warmth */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                        <span>Temperatura / Luz Solar</span>
                      </span>
                      <span className="font-mono text-slate-400">{warmth > 0 ? `+${warmth}` : warmth}</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={warmth}
                      onChange={(e) => setWarmth(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Zoom & Transforms */}
              {activeTab === 'transform' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Zoom e Enquadramento</span>
                      </span>
                      <span className="font-mono text-slate-400">{zoom.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={2.5}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => setFlipH(!flipH)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                        flipH ? 'bg-rose-950 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span>Espelhar H</span>
                    </button>
                    <button
                      onClick={() => setFlipV(!flipV)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                        flipV ? 'bg-rose-950 border-rose-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <FlipVertical className="w-4 h-4" />
                      <span>Espelhar V</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveAndApply}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-98"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando WebP...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Aplicar & Salvar</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
