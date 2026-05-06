import { X } from 'lucide-react';
import { useState } from 'react';

export default function ErrorBanner({ message }) {
  const [visible, setVisible] = useState(true);
  if (!visible || !message) return null;
  return (
    <div
      data-testid="error-banner"
      style={{
        background: 'var(--charcoal)', color: '#C68C0F', borderRadius: 4,
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16, fontSize: 14,
      }}
    >
      <span>{message}</span>
      <button
        onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C68C0F', padding: '0 0 0 12px', lineHeight: 1 }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
