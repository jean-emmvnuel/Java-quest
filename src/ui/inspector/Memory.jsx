/**
 * La mémoire, présentée comme des boîtes :
 * - chaque méthode en cours (main, puis celle qu'elle appelle…) a sa propre zone ;
 * - une variable simple est une boîte avec son nom et sa valeur ;
 * - un tableau est une rangée de cases numérotées à partir de 0 ;
 * - un objet est une fiche avec ses attributs.
 */
function ArrayView({ items }) {
  return (
    <span className="cells">
      {items.map((it, i) => (
        <span key={i} className={`cell ${it.changed ? 'cell-changed' : ''}`}>
          <span className="cell-value" key={it.value}>{it.value}</span>
          <span className="cell-index">{i}</span>
        </span>
      ))}
      {items.length === 0 && <span className="cell-empty">vide</span>}
    </span>
  );
}

function ObjectView({ object }) {
  return (
    <span className="obj">
      <span className="obj-head">{object.cls} <small>n°{object.id}</small></span>
      {object.fields.map((f) => (
        <span key={f.name} className={`obj-field ${f.changed ? 'obj-changed' : ''}`}>
          <span className="obj-name">{f.name}</span>
          <span className="obj-value" key={f.value}>{f.value}</span>
        </span>
      ))}
      {object.fields.length === 0 && <span className="obj-field obj-none">aucun attribut</span>}
    </span>
  );
}

function VarBox({ v }) {
  if (v.array) {
    return (
      <li className={`box box-wide t-array ${v.changed ? 'box-changed' : ''}`}>
        <span className="box-type">{v.type}</span>
        <ArrayView items={v.array} />
        <span className="box-name">{v.name}</span>
      </li>
    );
  }
  if (v.object) {
    return (
      <li className={`box box-wide t-object ${v.changed ? 'box-changed' : ''}`}>
        <span className="box-type">{v.type}</span>
        <ObjectView object={v.object} />
        <span className="box-name">{v.name}</span>
      </li>
    );
  }
  return (
    <li className={`box t-${v.type} ${v.changed ? 'box-changed' : ''}`}>
      <span className="box-type">{v.type}</span>
      <span className="box-value" key={v.value}>{v.value ?? '?'}</span>
      <span className="box-name">{v.name}</span>
    </li>
  );
}

export default function Memory({ vars, frames = [] }) {
  const groups = [];
  if (vars.some((v) => v.frame === -1)) groups.push({ key: 'static', title: 'Attributs static', vars: vars.filter((v) => v.frame === -1) });
  frames.forEach((f, i) => groups.push({ key: i, title: f.name, vars: vars.filter((v) => v.frame === i), current: i === frames.length - 1 }));
  if (!frames.length) groups.push({ key: 0, title: 'main', vars: vars.filter((v) => v.frame !== -1), current: true });
  const multi = groups.length > 1;

  return (
    <section className="panel memory" aria-label="Mémoire">
      <h3 className="panel-title">Mémoire</h3>
      {vars.length === 0 && groups.length <= 1 ? (
        <p className="panel-empty">Aucune variable pour l'instant.</p>
      ) : (
        <div className="frames">
          {groups.map((g) => (
            <div key={g.key} className={`frame ${g.current ? 'frame-current' : ''} ${multi ? '' : 'frame-solo'}`}>
              {multi && <span className="frame-title">{g.current ? '▶ ' : ''}{g.title}</span>}
              {g.vars.length ? (
                <ul className="boxes">{g.vars.map((v) => <VarBox key={`${v.depth}-${v.name}`} v={v} />)}</ul>
              ) : (
                <p className="panel-empty">Aucune variable.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
