export default function MetricCard({ label, value }) {
  return (
    <div className="card" style={{ minWidth: 160 }}>
      <div style={{ fontSize: 13, color: 'var(--smoke)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 36, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, color: 'var(--charcoal)', lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}
