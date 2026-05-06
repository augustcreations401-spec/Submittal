const STYLES = {
  Excellent:      { background: 'rgba(240,180,41,0.15)', color: '#C68C0F', border: '1px solid rgba(240,180,41,0.4)' },
  Good:           { background: 'rgba(240,180,41,0.08)', color: '#C68C0F', border: '1px solid rgba(240,180,41,0.2)' },
  Partial:        { background: 'rgba(58,58,58,0.08)',   color: 'var(--smoke)', border: '1px solid rgba(58,58,58,0.2)' },
  'Does Not Meet':{ background: 'rgba(27,27,27,0.08)',   color: 'var(--charcoal)', border: '1px solid rgba(27,27,27,0.25)' },
};

export default function StatusPill({ rating }) {
  const s = STYLES[rating] || STYLES['Partial'];
  return (
    <span
      data-testid="status-pill"
      style={{ ...s, borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap' }}
    >
      {rating}
    </span>
  );
}
