/**
 * ImóvelHub Image Processing & Validation Engine
 * Professional client-side image processing, compression, cropping, and validation.
 */

export const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
export const MAX_PHOTOS_PER_LISTING = 10;
export const MIN_IMAGE_DIMENSION = 200; // minimum width/height in px
export const MAX_IMAGE_DIMENSION = 2560; // scale down if larger to save memory & storage

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif'
];

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'INVALID_EXTENSION' | 'DIMENSIONS_TOO_SMALL' | 'MAX_PHOTOS_EXCEEDED' | 'DUPLICATE_IMAGE';
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageAdjustments {
  brightness: number; // -100 to 100, default 0
  contrast: number;   // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
  warmth: number;     // -100 to 100, default 0
  rotation: number;   // 0, 90, 180, 270
  flipH: boolean;     // true / false
  flipV: boolean;     // true / false
  zoom: number;       // 1.0 to 3.0, default 1.0
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProcessedImageResult {
  url: string;
  thumbnailUrl: string;
  blob: Blob;
  thumbnailBlob: Blob;
  size: number;
  width: number;
  height: number;
  hash: string;
  originalSize: number;
  savingsPercentage: number;
  name: string;
  mimeType: string;
}

/**
 * Calculates a SHA-256 hash from a File or Blob for deduplication
 */
export async function computeFileHash(file: Blob | File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Use Web Crypto API if available
    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Simple fallback hash
    let hash = 0;
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < Math.min(view.length, 100000); i++) {
      hash = ((hash << 5) - hash) + view[i];
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16) + '_' + file.size;
  } catch (e) {
    return 'h_' + Date.now() + '_' + file.size;
  }
}

/**
 * Read image dimensions from a File or Data URL
 */
export function getImageDimensions(source: File | string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Não foi possível ler as dimensões da imagem.'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Validates a single File object
 */
export async function validateImageFile(
  file: File,
  currentCount: number,
  existingHashes: string[] = []
): Promise<ValidationResult> {
  // 1. Max count check
  if (currentCount >= MAX_PHOTOS_PER_LISTING) {
    return {
      valid: false,
      code: 'MAX_PHOTOS_EXCEEDED',
      error: `Limite de ${MAX_PHOTOS_PER_LISTING} fotos atingido para este anúncio.`
    };
  }

  // 2. Extension check
  const fileName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      code: 'INVALID_EXTENSION',
      error: `Formato de arquivo não suportado (.${fileName.split('.').pop()}). Formatos permitidos: JPG, PNG, WebP, AVIF, HEIC.`
    };
  }

  // 3. MIME type check
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      code: 'INVALID_TYPE',
      error: `Tipo de mídia inválido (${file.type}). Por favor envie imagens válidas.`
    };
  }

  // 4. File size check (Max 3MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      error: `O arquivo "${file.name}" tem ${sizeMb} MB e ultrapassa o limite máximo de 3 MB.`
    };
  }

  // 5. Duplicate hash check
  const fileHash = await computeFileHash(file);
  if (existingHashes.includes(fileHash)) {
    return {
      valid: false,
      code: 'DUPLICATE_IMAGE',
      error: `A imagem "${file.name}" já foi adicionada a este anúncio (arquivo duplicado ignorado).`
    };
  }

  // 6. Dimensions check
  try {
    const dims = await getImageDimensions(file);
    if (dims.width < MIN_IMAGE_DIMENSION || dims.height < MIN_IMAGE_DIMENSION) {
      return {
        valid: false,
        code: 'DIMENSIONS_TOO_SMALL',
        error: `A imagem "${file.name}" é muito pequena (${dims.width}x${dims.height}px). Mínimo recomendado: 400x300px.`
      };
    }
  } catch (err) {
    // If browser couldn't read preview, still allow if standard mime
  }

  return { valid: true };
}

/**
 * Loads an image from a URL or DataURL safely
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Falha ao renderizar imagem para processamento.'));
    img.src = src;
  });
}

/**
 * Transforms, edits and compresses an image via HTML5 Canvas
 */
export async function processAndCompressImage(
  source: File | string,
  adjustments: Partial<ImageAdjustments> = {},
  options: {
    maxDimension?: number;
    quality?: number;
    outputType?: 'image/webp' | 'image/jpeg';
  } = {}
): Promise<ProcessedImageResult> {
  const maxDim = options.maxDimension || MAX_IMAGE_DIMENSION;
  const quality = options.quality ?? 0.85;
  const outputType = options.outputType || 'image/webp';

  let srcUrl = '';
  let originalSize = 0;
  let fileName = 'imovel-foto';

  if (typeof source === 'string') {
    srcUrl = source;
    originalSize = source.length * 0.75; // Approx bytes from base64
  } else {
    srcUrl = URL.createObjectURL(source);
    originalSize = source.size;
    fileName = source.name.replace(/\.[^/.]+$/, '');
  }

  const img = await loadImage(srcUrl);

  // Original natural dimensions
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  // Apply Crop if specified, otherwise whole image
  const crop = adjustments.crop || { x: 0, y: 0, width: nw, height: nh };
  
  // Calculate aspect-preserving output dimension
  let targetWidth = crop.width;
  let targetHeight = crop.height;

  // Check if rotation swaps dimensions
  const rot = (adjustments.rotation || 0) % 360;
  const isSwapped = rot === 90 || rot === 270;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  // Create main canvas
  const canvas = document.createElement('canvas');
  canvas.width = isSwapped ? targetHeight : targetWidth;
  canvas.height = isSwapped ? targetWidth : targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Não foi possível obter contexto 2D do Canvas.');
  }

  // Clear background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Move origin to center of canvas for rotation/flip
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // Rotate
  if (rot !== 0) {
    ctx.rotate((rot * Math.PI) / 180);
  }

  // Flip
  const scaleX = adjustments.flipH ? -1 : 1;
  const scaleY = adjustments.flipV ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  // Zoom
  const zoom = adjustments.zoom || 1.0;
  ctx.scale(zoom, zoom);

  // Filter adjustments: CSS Filter string
  const brightness = 100 + (adjustments.brightness || 0); // 100% is normal
  const contrast = 100 + (adjustments.contrast || 0);
  const saturation = 100 + (adjustments.saturation || 0);
  const warmth = adjustments.warmth || 0; // simulated with sepia/hue
  
  let filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  if (warmth > 0) {
    filterStr += ` sepia(${warmth * 0.3}%)`;
  } else if (warmth < 0) {
    filterStr += ` hue-rotate(${warmth * 0.4}deg)`;
  }
  ctx.filter = filterStr;

  // Draw cropped slice
  const drawW = isSwapped ? canvas.height : canvas.width;
  const drawH = isSwapped ? canvas.width : canvas.height;

  ctx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height,
    -drawW / 2, -drawH / 2, drawW, drawH
  );

  ctx.restore();

  // Create WebP / JPEG Blob
  const mainBlob: Blob = await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b || new Blob([], { type: outputType })),
      outputType,
      quality
    );
  });

  // Create Thumbnail Canvas (max 400x300)
  const thumbCanvas = document.createElement('canvas');
  const thumbRatio = Math.min(400 / canvas.width, 300 / canvas.height, 1);
  thumbCanvas.width = Math.round(canvas.width * thumbRatio);
  thumbCanvas.height = Math.round(canvas.height * thumbRatio);
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }

  const thumbBlob: Blob = await new Promise((resolve) => {
    thumbCanvas.toBlob(
      (b) => resolve(b || new Blob([], { type: outputType })),
      outputType,
      0.75
    );
  });

  // Compute hash of processed blob
  const hash = await computeFileHash(mainBlob);

  // Convert to Data URLs for persistent immediate offline state
  const mainDataUrl = canvas.toDataURL(outputType, quality);
  const thumbDataUrl = thumbCanvas.toDataURL(outputType, 0.75);

  // Clean up object URL if created
  if (typeof source !== 'string') {
    URL.revokeObjectURL(srcUrl);
  }

  const newSize = mainBlob.size;
  const savings = originalSize > 0 ? Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100)) : 0;

  return {
    url: mainDataUrl,
    thumbnailUrl: thumbDataUrl,
    blob: mainBlob,
    thumbnailBlob: thumbBlob,
    size: newSize,
    width: canvas.width,
    height: canvas.height,
    hash,
    originalSize,
    savingsPercentage: savings,
    name: `${fileName}.webp`,
    mimeType: outputType
  };
}

/**
 * YouTube Link validation and ID extractor
 */
export interface YouTubeVideoInfo {
  isValid: boolean;
  videoId?: string;
  embedUrl?: string;
  watchUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export function parseYouTubeUrl(url: string): YouTubeVideoInfo {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'URL vazia' };
  }

  const cleanUrl = url.trim();

  // Common YouTube Patterns
  // 1. https://www.youtube.com/watch?v=VIDEO_ID
  // 2. https://youtu.be/VIDEO_ID
  // 3. https://www.youtube.com/embed/VIDEO_ID
  // 4. https://www.youtube.com/shorts/VIDEO_ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = cleanUrl.match(regExp);

  if (match && match[2] && match[2].length === 11) {
    const videoId = match[2];
    return {
      isValid: true,
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  return {
    isValid: false,
    error: 'Link do YouTube inválido. Exemplo válido: https://www.youtube.com/watch?v=dQw4w9WgXcQ ou https://youtu.be/...'
  };
}
