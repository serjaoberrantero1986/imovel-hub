import React, { useRef, useState } from 'react';

export type PortalSearchPosition = { x: number; y: number };

export function MovablePortalSearch({ editing, position, onChange, children }:
  { editing: boolean; position: PortalSearchPosition; onChange: (position: PortalSearchPosition) => void; children: React.ReactNode }) {
  const [preview, setPreview] = useState<PortalSearchPosition>();
  const drag = useRef<{ pointerId: number; x: number; y: number; origin: PortalSearchPosition } | undefined>(undefined);
  const active = preview || position;
  const clamp = (point: PortalSearchPosition): PortalSearchPosition => {
    const mobile = window.innerWidth < 768;
    const horizontal = mobile ? 0 : Math.round(window.innerWidth * .3);
    return { x: Math.max(-horizontal, Math.min(horizontal, point.x)), y: Math.max(mobile ? -160 : -300, Math.min(220, point.y)) };
  };
  const finish = (pointerId: number) => {
    if (drag.current?.pointerId !== pointerId) return;
    const next = preview || position;
    drag.current = undefined; setPreview(undefined); onChange(next);
  };
  return <div className="portal-search-positioner" style={{ transform: 'translate3d('+active.x+'px,'+active.y+'px,0)' }}>
    {editing && <div className="portal-search-position-tools" data-canvas-tools>
      <button type="button" className="canvas-drag-handle" title="Arraste a busca. Duplo clique restaura a posição." aria-label="Mover barra de busca"
        onDoubleClick={() => onChange({x:0,y:0})}
        onPointerDown={event => { if (event.button !== 0) return; drag.current = {pointerId:event.pointerId,x:event.clientX,y:event.clientY,origin:position}; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); }}
        onPointerMove={event => { const current=drag.current;if(!current||current.pointerId!==event.pointerId)return; setPreview(clamp({x:current.origin.x+event.clientX-current.x,y:current.origin.y+event.clientY-current.y})); }}
        onPointerUp={event => finish(event.pointerId)} onPointerCancel={event => finish(event.pointerId)}
      >⠿ Mover busca</button>
      {(position.x!==0||position.y!==0)&&<button type="button" onClick={()=>onChange({x:0,y:0})}>Restaurar</button>}
    </div>}
    {children}
  </div>;
}
