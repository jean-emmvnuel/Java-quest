import { useState } from 'react';
import Icon from '../common/Icon.jsx';

const STORAGE_LABEL = {
  loading: 'Ouverture de la base…',
  sql: 'Enregistrée dans une base SQLite sur cet appareil',
  local: 'Enregistrée dans le navigateur (SQLite indisponible ici)',
};

/** Sauvegarde : état de la base, code de reprise à copier / coller, export du fichier .sqlite. */
export default function SavePanel({ progress }) {
  const [code, setCode] = useState('');
  const [pasted, setPasted] = useState('');
  const [msg, setMsg] = useState(null);

  const show = async () => {
    const c = await progress.resumeCode();
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg({ tone: 'ok', text: 'Code copié : colle-le dans Java Quest sur ton autre appareil.' });
    } catch {
      setMsg({ tone: 'ok', text: 'Sélectionne le code ci-dessous et copie-le.' });
    }
  };

  const restore = async () => {
    if (!pasted.trim()) return;
    if (!window.confirm('Remplacer ta progression actuelle par celle de ce code ?')) return;
    try {
      await progress.importCode(pasted);
      setPasted('');
      setMsg({ tone: 'ok', text: 'Progression reprise !' });
    } catch (e) {
      setMsg({ tone: 'ko', text: e.message });
    }
  };

  const download = () => {
    const bytes = progress.exportDatabase();
    if (!bytes) return;
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.sqlite3' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'java-quest.sqlite' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="save-panel">
      <div className="save-head">
        <div>
          <h3>Ma sauvegarde</h3>
          <p className={`save-status save-${progress.storage}`}>
            <span className="save-dot" />{STORAGE_LABEL[progress.storage]}
          </p>
        </div>
      </div>

      <div className="save-actions">
        <button className="btn btn-ghost" onClick={show} type="button">
          <Icon name="copy" /> <span>Copier mon code de reprise</span>
        </button>
        {progress.storage === 'sql' && (
          <button className="btn btn-ghost" onClick={download} type="button">
            <Icon name="download" /> <span>Télécharger la base</span>
          </button>
        )}
      </div>

      {code && <textarea className="save-code" readOnly value={code} rows={3} onFocus={(e) => e.target.select()} aria-label="Mon code de reprise" />}

      <label className="save-label" htmlFor="resume-input">Reprendre une partie commencée ailleurs</label>
      <div className="save-restore">
        <input
          id="resume-input"
          className="save-input"
          value={pasted}
          onChange={(e) => { setPasted(e.target.value); setMsg(null); }}
          placeholder="Colle ton code ici"
          spellCheck={false}
          autoComplete="off"
        />
        <button className="btn btn-blue" onClick={restore} disabled={!pasted.trim()} type="button">Reprendre</button>
      </div>

      {msg && <p className={`save-msg save-msg-${msg.tone}`} role="status">{msg.text}</p>}
    </section>
  );
}
