import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api/settings.js';
import Header from '../components/Header.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

function Field({ label, hint, value, onChange, type = 'text', readOnly = false }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--smoke)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: 12, color: 'var(--smoke)', opacity: 0.55, marginBottom: 6 }}>{hint}</div>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        style={{
          width: '100%', maxWidth: 480, padding: '9px 14px',
          border: `1.5px solid ${readOnly ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 4, fontSize: 15,
          background: readOnly ? 'rgba(0,0,0,0.03)' : 'var(--cream)',
          color: 'var(--charcoal)',
          cursor: readOnly ? 'default' : 'text',
        }}
      />
    </div>
  );
}

export default function SettingsView() {
  const [s, setS] = useState({
    company_name: '',
    coordinator_name: '',
    anthropic_api_key: '',
    deadline_warning_days: '7',
    tds_dir: '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings().then(setS).catch(e => setError(e.message));
  }, []);

  const set = (key) => (val) => setS(prev => ({ ...prev, [key]: val }));

  const saveAll = async () => {
    try {
      const { tds_dir, ...writeable } = s;
      await updateSettings(writeable);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      <Header breadcrumb="System / Settings" />
      <h1 className="display" style={{ margin: '32px 0 32px' }}>Settings.</h1>

      {error && <ErrorBanner message={error} />}

      <Field label="Company name" value={s.company_name || ''} onChange={set('company_name')} />
      <Field label="Default coordinator name" value={s.coordinator_name || ''} onChange={set('coordinator_name')} />
      <Field
        label="Anthropic API key"
        hint="Required for analyses and TDS uploads. Stored locally."
        value={s.anthropic_api_key || ''}
        onChange={set('anthropic_api_key')}
        type="password"
      />
      <Field
        label="Deadline warning threshold (days)"
        hint="Items due within this many days show in amber."
        value={s.deadline_warning_days || '7'}
        onChange={set('deadline_warning_days')}
      />
      <Field
        label="TDS storage path"
        hint="Server-side storage location. Set via TDS_DIR environment variable."
        value={s.tds_dir || './server/uploads/tds'}
        onChange={() => {}}
        readOnly
      />

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" style={{ fontSize: 15, padding: '11px 28px' }} onClick={saveAll}>
          Save settings
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 500 }}>Saved ✓</span>
        )}
      </div>
    </div>
  );
}
