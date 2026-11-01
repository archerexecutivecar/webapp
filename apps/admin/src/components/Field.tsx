export function Field({ id, label, type = 'text', value, onChange, error, autoComplete }: {
  id: string; label: string; type?: string; value: string; onChange: (v: string) => void; error?: string; autoComplete?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} name={id} type={type} value={value} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined} />
      {error && <p className="err" id={`${id}-err`}>{error}</p>}
    </div>
  );
}
