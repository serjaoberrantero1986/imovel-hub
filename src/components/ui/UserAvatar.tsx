import React, { useMemo, useState } from 'react';

interface UserAvatarProps {
  name: string;
  src?: string;
  className?: string;
  fallbackClassName?: string;
}

const PALETTES = [
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
];

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, src, className = '', fallbackClassName = '' }) => {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?', [name]);
  const palette = useMemo(() => PALETTES[Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % PALETTES.length], [name]);

  if (src && !failed) {
    return <img src={src} alt={name} onError={() => setFailed(true)} className={`object-cover ${className}`} />;
  }

  return (
    <div role="img" aria-label={`Avatar de ${name}`} className={`flex items-center justify-center font-bold ${palette} ${className} ${fallbackClassName}`}>
      {initials}
    </div>
  );
};
