import React from 'react';
import {
  Star,
  Maximize2,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PropertyMedia } from '../../types';

interface PropertyImageCardProps {
  item: PropertyMedia;
  idx: number;
  totalCount: number;
  isCover: boolean;
  isLocked: boolean;
  isBeingDragged: boolean;
  isDropTarget: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onPreview: (item: PropertyMedia) => void;
  onOpenEditor: (item: PropertyMedia) => void;
  onSetCover: (id: string) => void;
  onDelete: (id: string) => void;
  onCategoryChange: (id: string, category: PropertyMedia['category']) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export const PropertyImageCard: React.FC<PropertyImageCardProps> = ({
  item,
  idx,
  totalCount,
  isCover,
  isLocked,
  isBeingDragged,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onPreview,
  onOpenEditor,
  onSetCover,
  onDelete,
  onCategoryChange,
  onCaptionChange,
  onMoveUp,
  onMoveDown
}) => {
  return (
    <div
      draggable={!isLocked}
      onDragStart={() => onDragStart(idx)}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={() => onDrop(idx)}
      className={`group relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border transition-all ${
        isCover
          ? 'border-rose-500 shadow-md ring-2 ring-rose-500/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      } ${isBeingDragged ? 'opacity-40 scale-95' : ''} ${
        isDropTarget ? 'border-indigo-500 ring-4 ring-indigo-500/30' : ''
      }`}
    >
      {/* Photo Image Aspect Container */}
      <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={item.thumbnailUrl || item.url}
          alt={item.caption || `Foto ${idx + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Cover Photo Badge */}
        {isCover && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-rose-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-lg shadow-rose-600/30">
            <Star className="w-3 h-3 fill-current" />
            <span>FOTO DE CAPA</span>
          </span>
        )}

        {/* Order Index Pill */}
        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-mono font-bold">
          #{idx + 1}
        </span>

        {/* Size & Format Badge */}
        {item.size && (
          <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[9px] font-mono">
            {(item.size / 1024).toFixed(0)} KB {item.width ? `• ${item.width}x${item.height}` : ''}
          </span>
        )}

        {/* Overlay Action Buttons on Hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
          <button
            type="button"
            onClick={() => onPreview(item)}
            title="Visualizar em tamanho real"
            className="p-2 rounded-xl bg-white/90 text-slate-900 hover:bg-white transition-transform hover:scale-110 cursor-pointer shadow-lg"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {!isLocked && (
            <>
              <button
                type="button"
                onClick={() => onOpenEditor(item)}
                title="Recortar, girar e ajustar foto"
                className="p-2 rounded-xl bg-white/90 text-slate-900 hover:bg-rose-600 hover:text-white transition-transform hover:scale-110 cursor-pointer shadow-lg"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              {!isCover && (
                <button
                  type="button"
                  onClick={() => onSetCover(item.id)}
                  title="Tornar Foto de Capa"
                  className="p-2 rounded-xl bg-white/90 text-slate-900 hover:bg-rose-600 hover:text-white transition-transform hover:scale-110 cursor-pointer shadow-lg"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                title="Excluir Foto"
                className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-transform hover:scale-110 cursor-pointer shadow-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card Bottom: Category selection & Caption */}
      <div className="p-3 space-y-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <select
            disabled={isLocked}
            value={item.category || 'fachada'}
            onChange={(e) => onCategoryChange(item.id, e.target.value as any)}
            className="text-[11px] font-bold px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="fachada">Fachada</option>
            <option value="sala">Sala de Estar</option>
            <option value="quarto">Quarto / Suíte</option>
            <option value="cozinha">Cozinha / Gourmet</option>
            <option value="banheiro">Banheiro</option>
            <option value="lazer">Área de Lazer</option>
            <option value="planta">Planta Humanizada</option>
            <option value="outros">Outros</option>
          </select>

          {!isLocked && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => onMoveUp(idx)}
                title="Mover para cima"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === totalCount - 1}
                onClick={() => onMoveDown(idx)}
                title="Mover para baixo"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          disabled={isLocked}
          placeholder="Legenda da foto (ex: Suíte Master)..."
          value={item.caption || ''}
          onChange={(e) => onCaptionChange(item.id, e.target.value)}
          className="w-full px-2.5 py-1 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
        />
      </div>
    </div>
  );
};
