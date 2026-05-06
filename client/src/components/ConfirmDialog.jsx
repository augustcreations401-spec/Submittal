export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Delete' }) {
  return (
    <div
      data-testid="confirm-dialog"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div className="card" style={{ maxWidth: 400, width: '90%' }}>
        <div style={{ marginBottom: 20, color: 'var(--charcoal)', fontSize: 16, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
