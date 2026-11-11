import Rich from '../common/Rich.jsx';
import Mascot from '../common/Mascot.jsx';
import './feedback.css';

/**
 * Bit commente ce qui se passe : en train d'écrire, erreur de compilation,
 * erreur pendant l'exécution, ou résultat pas encore atteint.
 */
export default function Feedback({ state }) {
  if (!state) return null;
  const { tone, title, text, hint } = state;
  return (
    <section className={`feedback feedback-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Mascot mood={tone === 'typing' ? 'think' : 'oops'} size={46} />
      <div>
        <h3>{title}</h3>
        {text && <Rich as="p" text={text} />}
        {hint && <Rich as="p" className="feedback-hint" text={hint} />}
      </div>
    </section>
  );
}
