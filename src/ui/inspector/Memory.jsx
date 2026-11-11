/** La mémoire : chaque variable est une boîte avec une étiquette (son nom) et un contenu (sa valeur). */
export default function Memory({ vars }) {
  return (
    <section className="panel memory" aria-label="Mémoire">
      <h3 className="panel-title">Mémoire</h3>
      {vars.length === 0 ? (
        <p className="panel-empty">Aucune variable pour l'instant.</p>
      ) : (
        <ul className="boxes">
          {vars.map((v) => (
            <li key={`${v.depth}-${v.name}`} className={`box t-${v.type} ${v.changed ? 'box-changed' : ''}`}>
              <span className="box-type">{v.type}</span>
              <span className="box-value" key={v.value}>{v.value ?? '?'}</span>
              <span className="box-name">{v.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
