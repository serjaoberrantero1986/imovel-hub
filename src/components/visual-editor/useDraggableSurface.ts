import { useLayoutEffect, useRef, useState } from 'react';

type Point = { x: number; y: number; width: number };

export function useDraggableSurface(resetKey?: string) {
  const surfaceRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<Point>();
  const drag = useRef<{ pointerId: number; startX: number; startY: number; left: number; top: number } | undefined>(undefined);
  const clamp = (x: number, y: number): Point => {
    const node = surfaceRef.current;
    const width = Math.min(node?.offsetWidth || 320, window.innerWidth - 16);
    const height = Math.min(node?.offsetHeight || 80, window.innerHeight - 16);
    return { x: Math.max(8, Math.min(x, window.innerWidth - width - 8)), y: Math.max(8, Math.min(y, window.innerHeight - height - 8)), width };
  };
  useLayoutEffect(() => { setPosition(undefined); }, [resetKey]);
  useLayoutEffect(() => {
    const adjust = () => setPosition(current => current ? clamp(current.x, current.y) : current);
    const observer = new ResizeObserver(adjust);
    if (surfaceRef.current) observer.observe(surfaceRef.current);
    window.addEventListener('resize', adjust);
    return () => { observer.disconnect(); window.removeEventListener('resize', adjust); };
  }, []);
  const handleProps = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !surfaceRef.current) return;
      const rect = surfaceRef.current.getBoundingClientRect();
      drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      setPosition(clamp(current.left + event.clientX - current.startX, current.top + event.clientY - current.startY));
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => { if (drag.current?.pointerId === event.pointerId) drag.current = undefined; },
    onPointerCancel: () => { drag.current = undefined; },
    onDoubleClick: () => setPosition(undefined),
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (!event.key.startsWith('Arrow') || !surfaceRef.current) return;
      event.preventDefault();
      const rect = surfaceRef.current.getBoundingClientRect();
      setPosition(clamp(rect.left + (event.key === 'ArrowRight' ? 20 : event.key === 'ArrowLeft' ? -20 : 0), rect.top + (event.key === 'ArrowDown' ? 20 : event.key === 'ArrowUp' ? -20 : 0)));
    },
    title: 'Arraste para mover. Duplo clique restaura a posição.',
    'aria-label': 'Mover janela de edição',
    tabIndex: 0
  };
  return { surfaceRef, handleProps, resetPosition: () => setPosition(undefined), surfaceStyle: position ? { position: 'fixed' as const, left: position.x, top: position.y, right: 'auto', bottom: 'auto', width: position.width, boxSizing: 'border-box' as const, transform: 'none' } : undefined };
}
