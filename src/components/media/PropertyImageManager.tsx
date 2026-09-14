import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  RefreshCw, 
  Database, 
  ShieldAlert, 
  Link as LinkIcon, 
  X
} from 'lucide-react';
import { PropertyMedia } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  validateImageFile, 
  processAndCompressImage, 
  MAX_PHOTOS_PER_LISTING, 
  ALLOWED_EXTENSIONS,
  ProcessedImageResult
} from '../../lib/imageProcessing';
import { 
  uploadImageToStorage, 
  isSupabaseConfigured, 
  getStorageConfig 
} from '../../lib/supabaseStorage';
import { ImageEditorModal } from './ImageEditorModal';
import { PropertyImageCard } from './PropertyImageCard';
import { PropertyVideoTourSection } from './PropertyVideoTourSection';
import { SupabaseStorageConfigModal } from './SupabaseStorageConfigModal';
import { ManualImageUrlModal } from './ManualImageUrlModal';

interface PropertyImageManagerProps {
  propertyId?: string;
  propertyOwnerId?: string;
  mediaList: PropertyMedia[];
  onMediaChange: (updated: PropertyMedia[]) => void;
  videoUrl?: string;
  onVideoUrlChange?: (url: string) => void;
  readOnly?: boolean;
}

export const PropertyImageManager: React.FC<PropertyImageManagerProps> = ({
  propertyId = 'new-listing',
  propertyOwnerId,
  mediaList,
  onMediaChange,
  videoUrl = '',
  onVideoUrlChange,
  readOnly = false
}) => {
  const { currentUser, addToast } = useApp();
  
  // Drag-and-drop upload state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessingUploads, setIsProcessingUploads] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop reorder state
  const [draggedMediaIndex, setDraggedMediaIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Editor Modal state
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingMediaItem, setEditingMediaItem] = useState<PropertyMedia | null>(null);

  // Preview Lightbox
  const [previewMediaItem, setPreviewMediaItem] = useState<PropertyMedia | null>(null);

  // Supabase Config Modal
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  // URL manual add modal
  const [urlModalOpen, setUrlModalOpen] = useState(false);

  // 1. RBAC / Ownership Authorization Check
  // If propertyOwnerId is provided and does not match currentUser.id (unless currentUser is admin), block changes
  const isOwner = !propertyOwnerId || propertyOwnerId === currentUser.id || currentUser.role === 'admin';
  const isLocked = readOnly || !isOwner;

  // 2. Handle File Input Selection
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) {
      addToast({
        type: 'error',
        title: 'Acesso Restrito',
        message: 'Você só pode alterar imagens de anúncios pertencentes à sua conta.'
      });
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 3. Process Multiple Files with validation, deduplication and compression
  const processFiles = async (files: File[]) => {
    if (isLocked) return;

    const availableSlots = MAX_PHOTOS_PER_LISTING - mediaList.length;
    if (availableSlots <= 0) {
      addToast({
        type: 'warning',
        title: 'Limite de Fotos',
        message: `Este anúncio já atingiu a quantidade máxima de ${MAX_PHOTOS_PER_LISTING} fotos.`
      });
      return;
    }

    setIsProcessingUploads(true);
    const existingHashes = mediaList.map((m) => m.hash).filter(Boolean) as string[];
    const newMediaItems: PropertyMedia[] = [];
    let processedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (newMediaItems.length >= availableSlots) {
        addToast({
          type: 'info',
          title: 'Capacidade Máxima',
          message: `Apenas as primeiras fotos dentro do limite de ${MAX_PHOTOS_PER_LISTING} foram adicionadas.`
        });
        break;
      }

      const file = files[i];
      setUploadProgress(`Otimizando foto ${i + 1} de ${files.length}: ${file.name}...`);

      // Validation
      const validation = await validateImageFile(
        file,
        mediaList.length + newMediaItems.length,
        existingHashes
      );

      if (!validation.valid) {
        if (validation.code === 'DUPLICATE_IMAGE') {
          duplicateCount++;
        } else {
          errorCount++;
          addToast({
            type: 'warning',
            title: 'Arquivo Rejeitado',
            message: validation.error || 'Arquivo inválido.'
          });
        }
        continue;
      }

      try {
        // Compress & Convert to WebP
        const processed = await processAndCompressImage(file);

        // Check if hash matches any item in the current batch
        if (existingHashes.includes(processed.hash)) {
          duplicateCount++;
          continue;
        }
        existingHashes.push(processed.hash);

        // Upload to Supabase Storage (or fallback to local persistent optimized blob)
        const uploadResult = await uploadImageToStorage(
          propertyId,
          processed.blob,
          processed.hash,
          processed.name
        );

        const newMedia: PropertyMedia = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          url: uploadResult.publicUrl || processed.url,
          thumbnailUrl: processed.thumbnailUrl,
          mediaType: 'image',
          isCover: mediaList.length === 0 && newMediaItems.length === 0,
          order: mediaList.length + newMediaItems.length + 1,
          size: processed.size,
          width: processed.width,
          height: processed.height,
          hash: processed.hash,
          storagePath: uploadResult.storagePath,
          originalName: file.name,
          mimeType: processed.mimeType,
          category: 'fachada'
        };

        newMediaItems.push(newMedia);
        processedCount++;
      } catch (err) {
        console.error('Error compressing file:', file.name, err);
        errorCount++;
      }
    }

    setIsProcessingUploads(false);
    setUploadProgress(null);

    if (newMediaItems.length > 0) {
      const updated = [...mediaList, ...newMediaItems];
      // Ensure at least one cover exists
      if (!updated.some((m) => m.isCover)) {
        updated[0].isCover = true;
      }
      onMediaChange(updated);

      addToast({
        type: 'success',
        title: `${processedCount} Foto${processedCount > 1 ? 's' : ''} Adicionada${processedCount > 1 ? 's' : ''}!`,
        message: `Imagens comprimidas em formato WebP com alta fidelidade visual.`
      });
    }

    if (duplicateCount > 0) {
      addToast({
        type: 'info',
        title: 'Fotos Duplicadas Ignoradas',
        message: `${duplicateCount} arquivo(s) idêntico(s) já cadastrado(s) foram ignorados para evitar duplicidade.`
      });
    }
  };

  // 4. Drag & Drop Upload Zone Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver && !isLocked) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (isLocked) {
      addToast({
        type: 'error',
        title: 'Acesso Restrito',
        message: 'Você só pode alterar imagens de anúncios pertencentes à sua conta.'
      });
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    const files = droppedFiles.filter((f: File) =>
      ALLOWED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)) ||
      f.type.startsWith('image/')
    );

    if (files.length === 0) {
      addToast({
        type: 'warning',
        title: 'Nenhuma Imagem Válida',
        message: 'Por favor, arraste arquivos de imagem (JPG, PNG, WebP, AVIF, HEIC).'
      });
      return;
    }

    await processFiles(files);
  };

  // 5. Reordering via Drag and Drop
  const handleReorderDragStart = (index: number) => {
    if (isLocked) return;
    setDraggedMediaIndex(index);
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedMediaIndex === null || isLocked) return;
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleReorderDrop = (dropIndex: number) => {
    if (draggedMediaIndex === null || isLocked) return;
    if (draggedMediaIndex === dropIndex) {
      setDraggedMediaIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...mediaList];
    const [movedItem] = updated.splice(draggedMediaIndex, 1);
    updated.splice(dropIndex, 0, movedItem);

    // Reassign order
    const reordered = updated.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));

    onMediaChange(reordered);
    setDraggedMediaIndex(null);
    setDragOverIndex(null);

    addToast({
      type: 'info',
      title: 'Fotos Reordenadas',
      message: 'A nova sequência de exibição foi salva.'
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0 || isLocked) return;
    const updated = [...mediaList];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onMediaChange(updated.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index >= mediaList.length - 1 || isLocked) return;
    const updated = [...mediaList];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onMediaChange(updated.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  // 6. Set Cover Photo
  const handleSetCover = (id: string) => {
    if (isLocked) return;
    const updated = mediaList.map((m) => ({
      ...m,
      isCover: m.id === id
    }));
    onMediaChange(updated);
    addToast({
      type: 'success',
      title: 'Foto de Capa Atualizada',
      message: 'Esta imagem será o destaque principal do anúncio nos resultados.'
    });
  };

  // 7. Delete Photo
  const handleDeleteMedia = (id: string) => {
    if (isLocked) return;
    const target = mediaList.find((m) => m.id === id);
    const updated = mediaList.filter((m) => m.id !== id);

    // If deleted photo was cover, make first photo the cover
    if (target?.isCover && updated.length > 0) {
      updated[0].isCover = true;
    }

    onMediaChange(updated.map((m, idx) => ({ ...m, order: idx + 1 })));
    addToast({
      type: 'info',
      title: 'Foto Removida',
      message: 'A imagem foi excluída da galeria deste anúncio.'
    });
  };

  // 8. Edit / Crop Photo
  const handleOpenEditor = (item: PropertyMedia) => {
    if (isLocked) return;
    setEditingMediaItem(item);
    setEditorModalOpen(true);
  };

  const handleSaveEditedImage = (processed: ProcessedImageResult) => {
    if (!editingMediaItem || isLocked) return;

    const updated = mediaList.map((m) => {
      if (m.id === editingMediaItem.id) {
        return {
          ...m,
          url: processed.url,
          thumbnailUrl: processed.thumbnailUrl,
          size: processed.size,
          width: processed.width,
          height: processed.height,
          hash: processed.hash,
          mimeType: processed.mimeType
        };
      }
      return m;
    });

    onMediaChange(updated);
    addToast({
      type: 'success',
      title: 'Foto Atualizada',
      message: `Edições aplicadas e otimizadas em WebP (${(processed.size / 1024).toFixed(0)} KB).`
    });
  };

  // 9. Update Category / Tag
  const handleCategoryChange = (id: string, category: PropertyMedia['category']) => {
    if (isLocked) return;
    const updated = mediaList.map((m) => (m.id === id ? { ...m, category } : m));
    onMediaChange(updated);
  };

  // 10. Update Caption
  const handleCaptionChange = (id: string, caption: string) => {
    if (isLocked) return;
    const updated = mediaList.map((m) => (m.id === id ? { ...m, caption } : m));
    onMediaChange(updated);
  };

  // 11. Add Image by URL
  const handleAddManualUrl = (url: string) => {
    if (isLocked) return;

    if (mediaList.length >= MAX_PHOTOS_PER_LISTING) {
      addToast({
        type: 'warning',
        title: 'Limite de Fotos',
        message: `Limite de ${MAX_PHOTOS_PER_LISTING} fotos atingido.`
      });
      return;
    }

    const newMedia: PropertyMedia = {
      id: `url-media-${Date.now()}`,
      url,
      thumbnailUrl: url,
      mediaType: 'image',
      isCover: mediaList.length === 0,
      order: mediaList.length + 1,
      category: 'fachada'
    };

    onMediaChange([...mediaList, newMedia]);
    setUrlModalOpen(false);
    addToast({
      type: 'success',
      title: 'Imagem Adicionada',
      message: 'Foto adicionada via link externo.'
    });
  };

  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      
      {/* Security Warning Banner if User is Not Authorized */}
      {!isOwner && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
          <div className="text-xs">
            <span className="font-bold block">Acesso Somente Leitura (Restrito):</span>
            Você está visualizando este anúncio, mas apenas o anunciante proprietário tem permissão para alterar, excluir ou fazer upload de fotos.
          </div>
        </div>
      )}

      {/* Top Header Bar with Count & Supabase Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Photo Count & Limit Progress */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-rose-500" />
              <span>Galeria de Fotos do Anúncio</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              mediaList.length >= MAX_PHOTOS_PER_LISTING
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {mediaList.length} / {MAX_PHOTOS_PER_LISTING} fotos
            </span>
          </div>

          <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                mediaList.length >= MAX_PHOTOS_PER_LISTING ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${(mediaList.length / MAX_PHOTOS_PER_LISTING) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Buttons: Supabase badge & Manual Link */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(true)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              supabaseReady
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{supabaseReady ? 'Supabase Storage Ativo' : 'Supabase Storage (Config)'}</span>
          </button>

          {!isLocked && (
            <button
              type="button"
              onClick={() => setUrlModalOpen(true)}
              className="px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Link URL</span>
            </button>
          )}
        </div>

      </div>

      {/* Drag and Drop Upload Zone */}
      {!isLocked && (
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
              fileInputRef.current.click();
            }
          }}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
            isDraggingOver
              ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 scale-[1.01] ring-4 ring-rose-500/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
            onChange={handleFilesSelected}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-3 pointer-events-none">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center transition-all ${
              isDraggingOver
                ? 'bg-rose-600 text-white scale-110 shadow-xl shadow-rose-600/30'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
            }`}>
              <Upload className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                {isDraggingOver ? 'Solte as fotos para carregar' : 'Clique ou arraste as fotos do seu computador'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Suporta upload múltiplo • Compressão automática para WebP de alto padrão
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-mono">JPG, PNG, WebP, AVIF</span>
              <span>•</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">Máx. 3 MB por foto</span>
              <span>•</span>
              <span>Até 10 fotos</span>
            </div>
          </div>

          {/* Upload progress loading indicator */}
          {isProcessingUploads && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-3 text-white z-20 animate-in fade-in">
              <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
              <div className="text-sm font-bold">{uploadProgress || 'Processando e otimizando imagens...'}</div>
              <div className="text-xs text-slate-400">Validando dimensões e convertendo para WebP ultra-leve</div>
            </div>
          )}
        </div>
      )}

      {/* Photos Grid with Drag-and-Drop Reordering, Cover badge, Crop, and Delete */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Fotos do Imóvel ({mediaList.length})</span>
            {mediaList.length > 1 && !isLocked && (
              <span className="text-[11px] text-slate-400 font-normal lowercase">
                (arraste pelos cards ou use as setas para reordenar)
              </span>
            )}
          </label>
        </div>

        {mediaList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhuma foto cadastrada ainda
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Anúncios com mais de 5 fotos de alta qualidade recebem até 400% mais contatos e agendamentos de visita.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mediaList.map((item, idx) => (
              <PropertyImageCard
                key={item.id}
                item={item}
                idx={idx}
                totalCount={mediaList.length}
                isCover={!!item.isCover}
                isLocked={isLocked}
                isBeingDragged={draggedMediaIndex === idx}
                isDropTarget={dragOverIndex === idx}
                onDragStart={handleReorderDragStart}
                onDragOver={handleReorderDragOver}
                onDrop={handleReorderDrop}
                onPreview={(media) => setPreviewMediaItem(media)}
                onOpenEditor={(media) => handleOpenEditor(media)}
                onSetCover={handleSetCover}
                onDelete={handleDeleteMedia}
                onCategoryChange={handleCategoryChange}
                onCaptionChange={handleCaptionChange}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>
        )}
      </div>

      {/* YouTube Video Tour Integration Section */}
      <PropertyVideoTourSection
        videoUrl={videoUrl}
        isLocked={isLocked}
        onVideoUrlChange={onVideoUrlChange}
        onToast={addToast}
      />

      {/* Editor Modal for Crop, Rotate, Flip, Adjustments */}
      {editorModalOpen && editingMediaItem && (
        <ImageEditorModal
          isOpen={editorModalOpen}
          imageUrl={editingMediaItem.url}
          imageName={editingMediaItem.originalName || 'foto-imovel.webp'}
          onClose={() => {
            setEditorModalOpen(false);
            setEditingMediaItem(null);
          }}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* Preview Lightbox Modal */}
      {previewMediaItem && (
        <div 
          onClick={() => setPreviewMediaItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative flex flex-col"
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                {previewMediaItem.caption || 'Visualização em Alta Resolução'}
              </span>
              <button
                onClick={() => setPreviewMediaItem(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-2 bg-black">
              <img
                src={previewMediaItem.url}
                alt="Foto"
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual URL Link Add Modal */}
      <ManualImageUrlModal
        isOpen={urlModalOpen}
        onClose={() => setUrlModalOpen(false)}
        onAddUrl={handleAddManualUrl}
      />

      {/* Supabase Storage Configuration Modal */}
      <SupabaseStorageConfigModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        initialUrl={getStorageConfig().supabaseUrl}
        initialKey={getStorageConfig().supabaseAnonKey}
        initialBucket={getStorageConfig().bucketName}
        onSaved={(msg) => {
          addToast({
            type: 'success',
            title: 'Configurações Salvas',
            message: msg
          });
        }}
      />

    </div>
  );
};
