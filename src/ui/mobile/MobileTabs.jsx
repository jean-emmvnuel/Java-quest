import Icon from '../common/Icon.jsx';
import './mobile.css';

const TABS = [
  { id: 'lesson', label: 'Consigne', icon: 'book' },
  { id: 'code', label: 'Code', icon: 'code' },
  { id: 'result', label: 'Résultat', icon: 'play' },
];

/** Barre d'onglets en bas de l'écran, sur téléphone uniquement (cachée sur grand écran). */
export default function MobileTabs({ tab, onChange, badge, resultTone }) {
  return (
    <nav className="mtabs" aria-label="Sections du niveau">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`mtab ${tab === t.id ? 'on' : ''} ${t.id === 'result' && resultTone ? `tone-${resultTone}` : ''}`}
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          <span className="mtab-icon">
            <Icon name={t.icon} size={22} />
            {t.id === 'result' && badge && <span className="mtab-badge" />}
          </span>
          <span className="mtab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
