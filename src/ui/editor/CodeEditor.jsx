import { useMemo, useRef } from 'react';
import { highlight } from './highlight.js';
import { MAIN_FRAME } from '../../engine/index.js';
import './editor.css';

const INDENT = '    ';

function Line({ segs }) {
  if (!segs.length) return '​';
  return segs.map((s, i) => (s.c ? <span key={i} className={s.c}>{s.t}</span> : s.t));
}

/**
 * Éditeur de code : le « cadre » du niveau est fixe (grisé) — la classe Main et main,
 * ou bien le main qui utilise ta méthode / ta classe — et l'élève écrit dans la zone jaune.
 * Les numéros de ligne sont ceux du vrai fichier Main.java.
 */
export default function CodeEditor({ value, onChange, activeLine, errorLine, frame = MAIN_FRAME }) {
  const HEADER = frame.before;
  const FOOTER = frame.after;
  const FIRST_LINE = HEADER.length + 1;
  const ta = useRef(null);
  const userLines = value.split('\n');
  const hl = useMemo(() => highlight(value), [value]);
  const head = useMemo(() => (HEADER.length ? highlight(HEADER.join('\n')) : []), [HEADER]);
  const foot = useMemo(() => (FOOTER.length ? highlight(FOOTER.join('\n')) : []), [FOOTER]);
  const longest = Math.max(...userLines.map((l) => l.length), 36);
  const lastLine = FIRST_LINE + userLines.length - 1;

  const lineClass = (n) => (n === errorLine ? 'cl cl-error' : n === activeLine ? 'cl cl-active' : 'cl');

  function edit(next, caret) {
    onChange(next);
    requestAnimationFrame(() => ta.current?.setSelectionRange(caret, caret));
  }

  // Petites aides de saisie : tabulation, indentation automatique, accolades
  function onKeyDown(e) {
    const { selectionStart: s, selectionEnd: t } = e.currentTarget;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const remove = value.slice(lineStart, lineStart + 4).match(/^ */)[0].length;
        if (remove) edit(value.slice(0, lineStart) + value.slice(lineStart + remove), Math.max(lineStart, s - remove));
      } else {
        edit(value.slice(0, s) + INDENT + value.slice(t), s + INDENT.length);
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const current = value.slice(lineStart, s);
      let indent = current.match(/^\s*/)[0];
      const after = value.slice(t);
      if (current.trimEnd().endsWith('{')) {
        indent += INDENT;
        if (after.startsWith('}')) {
          const base = indent.slice(INDENT.length);
          edit(`${value.slice(0, s)}\n${indent}\n${base}${after}`, s + 1 + indent.length);
          return;
        }
      }
      edit(`${value.slice(0, s)}\n${indent}${after}`, s + 1 + indent.length);
      return;
    }
    if (e.key === '}' && s === t) {
      const current = value.slice(lineStart, s);
      if (/^\s+$/.test(current) && current.length >= 4) {
        e.preventDefault();
        edit(`${value.slice(0, s - 4)}}${value.slice(t)}`, s - 3);
      }
    }
  }

  return (
    <div className="editor" onClick={() => ta.current?.focus()}>
      <div className="editor-gutter" aria-hidden="true">
        {HEADER.map((_, i) => <div key={`h${i}`} className={`gl muted ${lineClass(i + 1)}`}>{i + 1}</div>)}
        {userLines.map((_, i) => {
          const n = FIRST_LINE + i;
          return <div key={n} className={`gl ${lineClass(n)}`}>{n}</div>;
        })}
        {FOOTER.map((_, i) => <div key={`f${i}`} className={`gl muted ${lineClass(lastLine + 1 + i)}`}>{lastLine + 1 + i}</div>)}
      </div>
      <div className="editor-scroll">
        <div className="editor-inner" style={{ minWidth: `${Math.max(longest + 12, ...[...HEADER, ...FOOTER].map((l) => l.length + 2))}ch`, '--indent': `${frame.indent ?? 8}ch` }}>
          <div className="editor-fixed">
            {head.map((l, i) => <div key={i} className={lineClass(i + 1)}><Line segs={l} /></div>)}
          </div>
          <div className="editor-edit">
            <pre className="editor-hl" aria-hidden="true">
              {hl.map((l, i) => <div key={i} className={lineClass(FIRST_LINE + i)}><Line segs={l} /></div>)}
            </pre>
            <textarea
              ref={ta}
              className="editor-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              wrap="off"
              rows={userLines.length}
              aria-label="Ton code Java, à l'intérieur de la méthode main"
            />
          </div>
          <div className="editor-fixed">
            {foot.map((l, i) => <div key={i} className={lineClass(lastLine + 1 + i)}><Line segs={l} /></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
