import React, {useLayoutEffect,useRef,useState} from 'react';

export function FloatingEditorBar({children}:{children:React.ReactNode}) {
  const ref=useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState<{x:number;y:number}>();
  const [collapsed,setCollapsed]=useState(false);
  const drag=useRef<{x:number;y:number;left:number;top:number} | undefined>(undefined);
  const clamp=(x:number,y:number)=>({x:Math.max(8,Math.min(x,window.innerWidth-(ref.current?.offsetWidth||300)-8)),y:Math.max(8,Math.min(y,window.innerHeight-(ref.current?.offsetHeight||60)-8))});
  useLayoutEffect(()=>{
    const adjust=()=>setPosition(current=>current?clamp(current.x,current.y):current);
    const observer=new ResizeObserver(adjust);if(ref.current)observer.observe(ref.current);
    window.addEventListener('resize',adjust);return()=>{observer.disconnect();window.removeEventListener('resize',adjust);};
  },[]);
  return <div ref={ref} data-canvas-tools className="canvas-command-bar" style={position?{left:position.x,top:position.y,transform:'none'}:undefined}>
    <button className="canvas-drag-handle" title="Arraste para mover; use as setas do teclado para reposicionar" aria-label="Mover barra do editor"
      onPointerDown={e=>{if(e.button!==0)return;const rect=ref.current!.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}}
      onPointerMove={e=>{if(drag.current)setPosition(clamp(drag.current.left+e.clientX-drag.current.x,drag.current.top+e.clientY-drag.current.y));}}
      onPointerUp={()=>{drag.current=undefined;}} onPointerCancel={()=>{drag.current=undefined;}}
      onKeyDown={e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();const rect=ref.current!.getBoundingClientRect();setPosition(clamp(rect.left+(e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0),rect.top+(e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0)));}}>⠿</button>
    {!collapsed&&children}
    <button onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Expandir barra':'Recolher barra'}>{collapsed?'Editar portal +':'−'}</button>
    {!collapsed&&<button onClick={()=>setPosition(undefined)} title="Restaurar posição da barra" aria-label="Restaurar posição da barra">↥</button>}
  </div>;
}
