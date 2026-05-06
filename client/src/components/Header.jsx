export default function Header({ breadcrumb, cta }) {
  return (
    <div style={{
      height: 56, background: '#F7F1E0', borderBottom: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, flexShrink: 0,
    }}>
      <div style={{ flex: 1, color: 'rgba(58,58,58,0.45)', fontSize: 13 }}>{breadcrumb}</div>
      {cta && <div>{cta}</div>}
    </div>
  );
}
