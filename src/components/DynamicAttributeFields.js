// src/components/DynamicAttributeFields.js
//
// Renders category-specific attribute fields (Brand, Material, RAM,
// Ingredients, etc.) from a config array — no category-specific JSX
// anywhere. Pass `theme` so it matches whichever screen it's used in
// (Admin's dark theme vs Seller's light theme).

export default function DynamicAttributeFields({ fields, values, onChange, theme }) {
  if (!fields || fields.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
      {fields.map((f) => (
        <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? 'span 2' : 'span 1' }}>
          <label style={theme.labelStyle}>
            {f.label}{f.required ? ' *' : ''}
          </label>
          {f.type === 'select' ? (
            <select value={values[f.key] || ''} onChange={(e) => onChange(f.key, e.target.value)} style={theme.inputStyle}>
              <option value="">Select...</option>
              {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea value={values[f.key] || ''} onChange={(e) => onChange(f.key, e.target.value)}
              style={{ ...theme.inputStyle, height: '70px', resize: 'none' }} />
          ) : (
            <input type={f.type === 'number' ? 'number' : 'text'} value={values[f.key] || ''}
              onChange={(e) => onChange(f.key, e.target.value)} style={theme.inputStyle} />
          )}
        </div>
      ))}
    </div>
  );
}