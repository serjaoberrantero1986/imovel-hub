import React from 'react';
import { createRoot } from 'react-dom/client';
import { ImageEditorModal } from '../components/media/ImageEditorModal';
import { ProcessedImageResult, validateImageFile } from './imageProcessing';

/** Shared editor for every user-supplied image. Cancellation is not an error. */
export async function editUserImage(file: File, purpose: 'photo' | 'avatar' | 'logo' | 'document' = 'photo', maxDimension = 1920): Promise<ProcessedImageResult | null> {
  const validation = await validateImageFile(file, 0);
  if (!validation.valid) throw new Error(validation.error || 'Imagem inválida.');
  return new Promise(resolve => {
    const host = document.createElement('div');
    host.setAttribute('data-image-editor-host', 'true');
    document.body.appendChild(host);
    const root = createRoot(host);
    const url = URL.createObjectURL(file);
    let settled = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); finish(null); }
    };
    const finish = (result: ProcessedImageResult | null) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', escape, true);
      document.body.style.overflow = previousOverflow;
      resolve(result);
      window.setTimeout(() => { root.unmount(); host.remove(); URL.revokeObjectURL(url); }, 0);
    };
    document.addEventListener('keydown', escape, true);
    root.render(<ImageEditorModal isOpen imageUrl={url} imageName={file.name} purpose={purpose} maxDimension={maxDimension} onSave={finish} onClose={() => finish(null)} />);
  });
}
