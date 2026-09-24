import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronRight, Home, Star } from 'lucide-react';
import { Property } from '../../types';
import { formatCurrency } from '../../lib/utils';
import './hero-scene.css';

interface HeroPropertySceneProps {
  properties: Property[];
  onOpenProperty: (id: string) => void;
  getTypeLabel: (type: string) => string;
}

const coverImage = (property: Property) =>
  property.media?.find(media => media.isCover && media.mediaType === 'image' && media.url)?.url
  || property.media?.find(media => media.mediaType === 'image' && media.url)?.url
  || property.images?.[0]
  || '';

// These anchors are an illustration over the photograph, not geographic coordinates.
const anchors = [
  { x: '13%', y: '72%', color: '#be8aef' },
  { x: '50%', y: '58%', color: '#ff54ae' },
  { x: '86%', y: '82%', color: '#ffb58f' },
];

export function HeroPropertyScene({ properties, onOpenProperty, getTypeLabel }: HeroPropertySceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [path, setPath] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const gradientId = `hero-route-${useId().replace(/:/g, '')}`;

  const listings = useMemo(() => {
    const selected = properties
      .filter(property => property.id && property.title && property.status === 'active')
      .sort((a, b) => Number(b.featured) - Number(a.featured))
      .slice(0, 3);
    // Put the highest-priority listing in the large middle card.
    return selected.length > 1 ? [selected[1], selected[0], ...selected.slice(2)] : selected;
  }, [properties]);
  const listingKey = listings.map(property => property.id).join(',');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || listings.length < 2) {
      setPath('');
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = stage.getBoundingClientRect();
        const points = nodesRef.current.slice(0, listings.length).flatMap(node => {
          if (!node) return [];
          const rect = node.getBoundingClientRect();
          return [{ x: rect.left + rect.width / 2 - bounds.left, y: rect.bottom - bounds.top }];
        });
        if (points.length < 2) return;
        let route = `M ${points[0].x} ${points[0].y}`;
        for (let index = 1; index < points.length; index++) {
          const start = points[index - 1];
          const end = points[index];
          const distance = (end.x - start.x) / 3;
          route += ` C ${start.x + distance} ${start.y + 28}, ${end.x - distance} ${end.y + 28}, ${end.x} ${end.y}`;
        }
        setPath(route);
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    nodesRef.current.slice(0, listings.length).forEach(node => node && observer.observe(node));
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [listingKey, listings.length]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let inView = false;
    const update = () => setIsPlaying(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(scene);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      className="hero-property-scene"
      data-empty={listings.length === 0}
      data-playing={isPlaying}
      role={listings.length ? 'region' : undefined}
      aria-label={listings.length ? 'Imóveis para conhecer' : undefined}
    >
      <div
        ref={stageRef}
        className="hero-property-stage"
        data-count={listings.length}
        style={{ '--property-count': listings.length } as React.CSSProperties}
      >
        {path && listings.length > 1 && (
          <svg className="hero-property-routes" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#be8aef" />
                <stop offset="50%" stopColor="#ff54ae" />
                <stop offset="100%" stopColor="#ffb58f" />
              </linearGradient>
            </defs>
            <path d={path} className="hero-route-halo" stroke={`url(#${gradientId})`} />
            <path d={path} className="hero-route-line" stroke={`url(#${gradientId})`} />
            <path d={path} pathLength={1} className="hero-route-light" />
          </svg>
        )}
        {listings.map((property, index) => {
          const prominent = listings.length === 1 || index === 1;
          const anchor = anchors[listings.length === 1 ? 1 : index];
          const image = coverImage(property);
          const location = [property.neighborhood, property.city].filter(Boolean).join(' · ');
          return (
            <div
              key={property.id}
              ref={node => { nodesRef.current[index] = node; }}
              className="hero-property-node"
              data-prominent={prominent}
              style={{
                '--anchor-x': anchor.x,
                '--anchor-y': anchor.y,
                '--pin-color': anchor.color,
                '--slot': index,
                '--arrival-delay': `${index * 2.4}s`,
              } as React.CSSProperties}
            >
              <button
                type="button"
                className="hero-property-card"
                onClick={() => onOpenProperty(property.id)}
                aria-label={`Ver ${property.title}, ${formatCurrency(property.price)}${property.purpose === 'rent' ? ' por mês' : ''}`}
              >
                <span className="hero-property-photo">
                  <Home className="hero-property-placeholder" aria-hidden="true" />
                  {image && (
                    <img
                      key={image}
                      src={image}
                      alt=""
                      loading="eager"
                      decoding="async"
                      onError={event => { event.currentTarget.style.visibility = 'hidden'; }}
                    />
                  )}
                  {property.featured && (
                    <span className="hero-property-featured"><Star size={12} fill="currentColor" aria-hidden="true" /> Destaque</span>
                  )}
                </span>
                <span className="hero-property-info">
                  <span className="hero-property-type">{getTypeLabel(property.type)}</span>
                  {location && <span className="hero-property-location" title={location}>{location}</span>}
                  <span className="hero-property-price">
                    {formatCurrency(property.price)}
                    {property.purpose === 'rent' && <small> / mês</small>}
                  </span>
                  <ChevronRight className="hero-property-arrow" size={17} aria-hidden="true" />
                </span>
              </button>
              <span className="hero-property-pin" aria-hidden="true">
                <svg viewBox="0 0 32 44" focusable="false">
                  <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 28 16 28s16-17 16-28C32 7.2 24.8 0 16 0Z" fill="currentColor" />
                  <circle cx="16" cy="16" r="6" fill="#21162f" fillOpacity=".64" />
                </svg>
                <span className="hero-pin-halo" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
