/** Barre de progression de la mission : une pastille par niveau (réussi, en cours, à faire). */
export default function MissionProgress({ mission, currentId, stars, onPick }) {
  const done = mission.levels.filter((l) => stars[l.id]).length;
  const pct = (done / mission.levels.length) * 100;
  return (
    <div className="mprog" aria-label={`${mission.project ? 'Projet' : `Mission ${mission.num}`} : ${done} ${mission.project ? 'étapes' : 'niveaux'} réussi${done > 1 ? 's' : ''} sur ${mission.levels.length}`}>
      <div className="mprog-bar"><span className="mprog-fill" style={{ width: `${pct}%` }} /></div>
      <div className="mprog-dots">
        {mission.levels.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`mdot ${stars[l.id] ? 'done' : ''} ${l.id === currentId ? 'current' : ''}`}
            onClick={() => onPick(l.id)}
            title={`${l.id} · ${l.title}`}
            aria-label={`Niveau ${l.id} : ${l.title}${stars[l.id] ? ' (réussi)' : ''}`}
          >
            {stars[l.id] ? '✓' : l.id.split('-')[1]}
          </button>
        ))}
      </div>
    </div>
  );
}
