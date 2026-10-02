import React, {useState} from 'react';
import { useDraggableSurface } from './useDraggableSurface';

export function FloatingEditorBar({children}:{children:React.ReactNode}) {
  const [collapsed,setCollapsed]=useState(false);
  const movable=useDraggableSurface();
  return <div ref={node=>{movable.surfaceRef.current=node;}} data-canvas-tools className="canvas-command-bar" style={movable.surfaceStyle}>
    <button className="canvas-drag-handle" {...movable.handleProps}>⠿</button>
    {!collapsed&&children}
    <button onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Expandir barra':'Recolher barra'}>{collapsed?'Editar portal +':'−'}</button>
    {!collapsed&&<button onClick={movable.resetPosition} title="Restaurar posição da barra" aria-label="Restaurar posição da barra">↥</button>}
  </div>;
}
