/** Document-level capture also covers header, footer and mobile navigation outside the canvas. */
export function installPortalEditorGuard(select: (element: HTMLElement) => void, history: (redo: boolean) => void) {
  const editable = (target: Element) => target.closest<HTMLElement>('[contenteditable="true"][data-canvas-id]');
  const permitted = (target: Element) => Boolean(target.closest('[data-canvas-tools],[data-image-editor-host]'));
  const stop = (event: Event, cancel = true) => { if(cancel) event.preventDefault(); event.stopImmediatePropagation(); };
  const listener = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    if(!target || permitted(target)) return;
    if(event instanceof DragEvent && event.type==='drop' && target.closest('.canvas-section') && event.dataTransfer?.types.includes('application/x-portal-section'))return;
    const text = editable(target);
    if(event instanceof KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && ['z','y'].includes(event.key.toLowerCase())) {stop(event);history(event.shiftKey || event.key.toLowerCase()==='y');return;}
      if(text) { if(event.type==='keydown' && (event.ctrlKey||event.metaKey) && ['b','i','u'].includes(event.key.toLowerCase())){ event.preventDefault(); document.dispatchEvent(new CustomEvent('portal-format',{detail:event.key.toLowerCase()})); } return; }
      if(['Enter',' '].includes(event.key) || target.matches('input,textarea,select')) stop(event);
      return;
    }
    if(event.type==='click') {
      const element = target.closest<HTMLElement>('[data-canvas-id]');
      if(element) select(element);
      stop(event, !text || Boolean(target.closest('a,button')));
      return;
    }
    if(event.type==='focusin') {
      if(!text && target.matches('input,textarea,select,a,button,[role=button]')) (target as HTMLElement).blur();
      return;
    }
    if(text && !['auxclick','contextmenu','submit','dragstart','drop'].includes(event.type)) return;
    if(event.type==='pointerdown' || event.type==='mousedown' || event.type==='touchstart') { stop(event, target.matches('input,textarea,select') || Boolean(target.closest('a'))); return; }
    stop(event);
  };
  const events=['click','auxclick','dblclick','contextmenu','submit','keydown','keyup','keypress','pointerdown','mousedown','touchstart','dragstart','drop','focusin'];
  events.forEach(name=>document.addEventListener(name,listener,{capture:true,passive:false}));
  return ()=>events.forEach(name=>document.removeEventListener(name,listener,true));
}
