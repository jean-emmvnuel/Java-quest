import { useEffect, useRef } from 'react';

export default function ConsoleView({ out, error }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [out]);
  return (
    <section className="panel console" aria-label="Console">
      <h3 className="panel-title">Console</h3>
      <pre ref={ref} className="console-out">
        {out || (!error && <span className="panel-empty">Ce que tu affiches avec System.out.println apparaît ici.</span>)}
        {error && <span className="console-err">{`Erreur ligne ${error.line ?? '?'} : ${error.message}`}</span>}
      </pre>
    </section>
  );
}
