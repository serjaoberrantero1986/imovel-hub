import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { FileText, Home, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import {
  DEFAULT_VISUAL_PORTAL_CONFIGURATION,
  VisualPortalConfiguration,
  ensureMyVisualPortalConfiguration,
  fetchMyVisualPortalConfiguration,
  isSectionVisible,
  publishMyVisualPortalConfiguration,
} from '../../lib/visualPortalEditor';
import { PortalCanvas } from './PortalCanvas';
import { PortalVisualEditor } from './PortalVisualEditor';
import { usePortalSession } from './usePortalSession';

interface PortalEditorState {
  configuration: VisualPortalConfiguration;
  editing: boolean;
  canEdit: boolean;
  busy: boolean;
  unpublished: boolean;
  openEditor: (targetId?: string) => Promise<void>;
  isVisible: (id: Parameters<typeof isSectionVisible>[1]) => boolean;
}

const PortalEditorContext = createContext<PortalEditorState | null>(null);
export const usePortalEditorShell = () => {
  const context = useContext(PortalEditorContext);
  if (!context) throw new Error('O editor visual precisa estar dentro de PortalEditorProvider.');
  return context;
};

export function PortalEditorProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthenticated, currentView, activeLegalTab, setCurrentView, setActiveLegalTab, addToast } = useApp();
  const session = usePortalSession(currentUser.id);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionOwner, setSessionOwner] = useState<string | null>(null);
  const [published, setPublished] = useState<VisualPortalConfiguration | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const ownerRef = useRef(currentUser.id); ownerRef.current = currentUser.id;
  const canEdit = isAuthenticated && (currentUser.role === 'broker' || currentUser.role === 'agency');
  const configuration = sessionOwner === currentUser.id && canEdit ? session.value : published || DEFAULT_VISUAL_PORTAL_CONFIGURATION;
  const unpublished = sessionOwner === currentUser.id && JSON.stringify(session.value) !== JSON.stringify(published);

  useEffect(() => {
    let cancelled = false;
    setEditing(false); setSettingsOpen(false); setSessionOwner(null);
    if (!canEdit) { setPublished(null); return () => { cancelled = true; }; }
    void (async () => {
      try {
        await ensureMyVisualPortalConfiguration(currentUser.id);
        const result = await fetchMyVisualPortalConfiguration(currentUser.id);
        if (!cancelled) setPublished(result.published);
      } catch { if (!cancelled) setPublished(null); }
    })();
    return () => { cancelled = true; };
  }, [canEdit, currentUser.id]);

  useEffect(() => {
    if (!unpublished) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unpublished]);

  const openEditor = async (targetId?: string) => {
    if (!canEdit) return;
    setPendingTarget(targetId || null);
    if (sessionOwner === currentUser.id) { setEditing(true); return; }
    const owner = currentUser.id; setBusy(true);
    try {
      await ensureMyVisualPortalConfiguration(owner);
      const result = await fetchMyVisualPortalConfiguration(owner);
      if (ownerRef.current !== owner) return;
      session.reset(result.published); setPublished(result.published); setSessionOwner(owner); setEditing(true);
    } catch (error) {
      addToast({ type: 'error', title: 'Editor indisponível', message: error instanceof Error ? error.message : 'Não foi possível abrir o editor.' });
    } finally { setBusy(false); }
  };
  useEffect(() => {
    if (!editing || !pendingTarget) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-canvas-id="${CSS.escape(pendingTarget)}"]`);
      if (target) {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        target.click();
      }
      setPendingTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing, pendingTarget, currentView, activeLegalTab]);
  const discard = async () => {
    if (!window.confirm('Descartar as alterações não publicadas?')) return;
    setBusy(true); session.reset(published || DEFAULT_VISUAL_PORTAL_CONFIGURATION);
    try { await session.discardAssets(); }
    catch (error) { addToast({ type: 'warning', title: 'Limpeza pendente', message: error instanceof Error ? error.message : 'Não foi possível limpar imagens temporárias.' }); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    setBusy(true);
    try {
      const owner = currentUser.id; const ready = await session.materialize(session.value);
      if (ownerRef.current !== owner) return;
      await publishMyVisualPortalConfiguration(owner, ready);
      if (ownerRef.current !== owner) return;
      session.commitAssets(ready); session.reset(ready); setPublished(ready);
      addToast({ type: 'success', title: 'Versão publicada', message: 'Página inicial, rodapé e documentos foram publicados juntos.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Publicação não concluída', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally { setBusy(false); }
  };
  const navigateEditor = (page: 'portal'|'terms'|'privacy'|'consumer'|'security'|'cookies') => {
    if (page === 'portal') setCurrentView('portal');
    else { setActiveLegalTab(page); setCurrentView('legal'); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const value: PortalEditorState = { configuration, editing, canEdit, busy: busy || session.preparing, unpublished, openEditor, isVisible: id => isSectionVisible(configuration, id) };

  return <PortalEditorContext.Provider value={value}>
    <PortalCanvas value={configuration} editing={editing && canEdit} busy={busy || session.preparing} ownerId={currentUser.id} scope={currentView==='legal'?`legal.${activeLegalTab}`:'home'}
      onChange={session.change} unpublished={unpublished} onDiscard={() => void discard()} onUndo={session.undo} onRedo={session.redo}
      canUndo={session.canUndo} canRedo={session.canRedo} onPrepareImage={session.prepareImage} onPublish={() => void publish()}
      onClose={() => { setEditing(false); setSettingsOpen(false); }} onSettings={() => setSettingsOpen(true)}>
      {children}
    </PortalCanvas>
    {canEdit && !editing && unpublished && <div className="canvas-preview-status">Prévia privada · alterações não publicadas</div>}
    {canEdit && !editing && (currentView === 'portal' || currentView === 'legal') && createPortal(<button type="button" data-canvas-tools onClick={() => void openEditor(currentView === 'legal' ? `legal.${activeLegalTab}.document` : undefined)} disabled={busy} className="fixed bottom-24 right-4 z-[89] inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-extrabold text-white shadow-xl shadow-slate-950/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60 dark:bg-white dark:text-slate-900 sm:bottom-6 sm:right-6"><Sparkles className="h-4 w-4 text-rose-400" />{busy ? 'Abrindo editor...' : 'Editar portal'}</button>, document.body)}
    {editing && <nav className="canvas-page-switcher" data-canvas-tools aria-label="Páginas do editor"><button onClick={() => navigateEditor('portal')} aria-pressed={currentView === 'portal'}><Home size={15}/>Início</button><details><summary><FileText size={15}/>Documentos</summary><div>{(['terms','privacy','consumer','security','cookies'] as const).map((id,index)=><button key={id} onClick={()=>navigateEditor(id)}>{['Termos','Privacidade','Consumidor','Segurança','Cookies'][index]}</button>)}</div></details></nav>}
    {editing && settingsOpen && <PortalVisualEditor configuration={session.value} busy={busy || session.preparing} onChange={session.change} onClose={() => setSettingsOpen(false)} onPublish={() => void publish()} onPrepareImage={session.prepareImage}/>} 
  </PortalEditorContext.Provider>;
}
