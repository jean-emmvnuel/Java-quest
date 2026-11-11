export default function Segmented({ value, options, onChange, label, small }) {
  return (
    <div className={`segmented ${small ? 'segmented-sm' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={`seg ${value === o.id ? 'on' : ''} ${o.tone ? `seg-${o.tone}` : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
