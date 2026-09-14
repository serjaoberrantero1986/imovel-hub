import React, { useState } from 'react';
import { Video } from 'lucide-react';
import { parseYouTubeUrl } from '../../lib/imageProcessing';

interface PropertyVideoTourSectionProps {
  videoUrl: string;
  isLocked: boolean;
  onVideoUrlChange?: (url: string) => void;
  onToast: (toast: { type: 'success' | 'warning' | 'info'; title: string; message?: string }) => void;
}

export const PropertyVideoTourSection: React.FC<PropertyVideoTourSectionProps> = ({
  videoUrl,
  isLocked,
  onVideoUrlChange,
  onToast
}) => {
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [videoInput, setVideoInput] = useState(videoUrl);

  const parsedVideo = parseYouTubeUrl(videoUrl);

  const handleApplyVideo = () => {
    if (isLocked) return;
    if (!videoInput.trim()) {
      if (onVideoUrlChange) onVideoUrlChange('');
      setIsEditingVideo(false);
      return;
    }

    const check = parseYouTubeUrl(videoInput);
    if (!check.isValid) {
      onToast({
        type: 'warning',
        title: 'Link de Vídeo Inválido',
        message: check.error || 'Informe um link válido do YouTube.'
      });
      return;
    }

    if (onVideoUrlChange) {
      onVideoUrlChange(videoInput.trim());
    }
    setIsEditingVideo(false);
    onToast({
      type: 'success',
      title: 'Vídeo do YouTube Vinculado!',
      message: 'O tour em vídeo será exibido com destaque na página do imóvel.'
    });
  };

  const handleRemoveVideo = () => {
    if (isLocked) return;
    if (onVideoUrlChange) onVideoUrlChange('');
    setVideoInput('');
    setIsEditingVideo(false);
    onToast({
      type: 'info',
      title: 'Vídeo Removido',
      message: 'O link de vídeo foi desvinculado do anúncio.'
    });
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white font-['Outfit']">
              Tour em Vídeo no YouTube
            </h4>
            <p className="text-xs text-slate-500">
              Adicione o link do vídeo para atrair compradores que preferem tour virtual
            </p>
          </div>
        </div>

        {!isLocked && (
          <button
            type="button"
            onClick={() => setIsEditingVideo(!isEditingVideo)}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            {videoUrl ? 'Alterar Link' : '+ Adicionar Link'}
          </button>
        )}
      </div>

      {/* Video Editor Form */}
      {isEditingVideo && !isLocked && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            URL do Vídeo do YouTube:
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />
            <button
              type="button"
              onClick={handleApplyVideo}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer"
            >
              Salvar Vídeo
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Formatos aceitos: links normais de vídeo, Shorts ou links compartilhados youtu.be.
          </p>
        </div>
      )}

      {/* Video Live Preview */}
      {parsedVideo.isValid && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div className="md:col-span-6 relative aspect-video rounded-xl overflow-hidden bg-black shadow-md">
            <iframe
              src={parsedVideo.embedUrl}
              title="Tour do Imóvel no YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
          
          <div className="md:col-span-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase">
                YouTube Conectado
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {parsedVideo.videoId}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              O player interativo foi validado e será exibido na página pública do imóvel.
            </p>
            
            {!isLocked && (
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="text-xs font-bold text-rose-600 hover:underline pt-1 cursor-pointer block"
              >
                Remover vídeo do anúncio
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
