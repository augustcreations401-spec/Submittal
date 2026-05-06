import StatusPill from './StatusPill.jsx';

export default function ProductCard({ product, rank, onCompare, onApprove }) {
  return (
    <div className="card" style={{ marginBottom: 12, borderLeft: rank === 0 ? '3px solid var(--saffron)' : '3px solid transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 42, fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', color: 'var(--saffron)', lineHeight: 1 }}>
          {product.score}%
        </div>
        <StatusPill rating={product.rating} />
      </div>
      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 20, color: 'var(--charcoal)', marginBottom: 2, lineHeight: 1.2 }}>
        {product.productName}
      </div>
      {product.manufacturer && (
        <div style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.65, marginBottom: 12 }}>{product.manufacturer}</div>
      )}
      {product.summary && (
        <div style={{ fontSize: 13, color: 'var(--smoke)', marginBottom: 12, lineHeight: 1.5 }}>{product.summary}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => onApprove && onApprove(product)}>
          Approve
        </button>
        {rank > 0 && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => onCompare && onCompare(product)}>
            Compare
          </button>
        )}
      </div>
    </div>
  );
}
