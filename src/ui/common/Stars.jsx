import Icon from './Icon.jsx';

export default function Stars({ count, max = 3, size = 16, animate = false }) {
  return (
    <span className={`stars ${animate ? 'stars-animate' : ''}`} aria-label={`${count} étoile${count > 1 ? 's' : ''} sur ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? 'star on' : 'star'} style={{ '--i': i }}>
          <Icon name="star" size={size} />
        </span>
      ))}
    </span>
  );
}
