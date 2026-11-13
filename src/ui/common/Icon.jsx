// Petites icônes vectorielles (trait arrondi), colorées par currentColor.
const PATHS = {
  left: 'M15 6 9 12l6 6',
  right: 'm9 6 6 6-6 6',
  down: 'm6 9 6 6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12 5 5 9-10',
  pause: 'M8 5v14M16 5v14',
  replay: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4',
  step: 'M5 12h10M11 6l6 6-6 6M20 5v14',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h13',
  code: 'M8 7 3 12l5 5M16 7l5 5-5 5M13.5 5l-3 14',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
};

export default function Icon({ name, size = 18, className = '' }) {
  if (name === 'play') {
    return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z" fill="currentColor" /></svg>;
  }
  if (name === 'star') {
    return (
      <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24">
        <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="currentColor" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
