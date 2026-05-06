import { useState } from 'react';
import { FileText } from 'lucide-react';

export default function DropZone({ onFile, accept = '.pdf', label = 'Drop spec section PDF here' }) {
  const [info, setInfo] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file) => {
    if (!file) return;
    setInfo({ name: file.name, size: (file.size / 1024).toFixed(0) + ' KB' });
    onFile(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => document.getElementById('dz-input-' + label.slice(0,8)).click()}
      style={{
        background: 'var(--sand)',
        border: `2px dashed ${dragging ? 'var(--saffron)' : 'rgba(58,58,58,0.35)'}`,
        borderRadius: 4, padding: '40px 32px', textAlign: 'center', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <input
        id={'dz-input-' + label.slice(0,8)}
        type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => handle(e.target.files[0])}
      />
      <FileText size={32} strokeWidth={1} style={{ color: 'var(--smoke)', marginBottom: 12, opacity: 0.5 }} />
      {info ? (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--charcoal)', marginBottom: 2 }}>{info.name}</div>
          <div style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.6 }}>{info.size}</div>
        </div>
      ) : (
        <div style={{ color: 'var(--smoke)' }}>
          {label}<br />
          <span style={{ fontSize: 13, opacity: 0.55 }}>or click to browse</span>
        </div>
      )}
    </div>
  );
}
