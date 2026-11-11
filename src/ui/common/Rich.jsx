// Texte avec `code` en ligne et **gras**.
export default function Rich({ text, as: Tag = 'span', className }) {
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <Tag className={className}>
      {parts.map((p, i) => {
        if (p.length > 1 && p.startsWith('`') && p.endsWith('`')) return <code key={i} className="inline-code">{p.slice(1, -1)}</code>;
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        return p;
      })}
    </Tag>
  );
}
