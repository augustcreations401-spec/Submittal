// client/src/views/AuditTrail.jsx
import { useState, useEffect, useCallback } from 'react';
import { getAuditLog } from '../api/submittals.js';
import { getProjects } from '../api/projects.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const ACTION_LABELS = {
  project_created: 'Project created', project_updated: 'Project updated', project_deleted: 'Project deleted',
  item_added: 'Item added', item_updated: 'Item updated', item_deleted: 'Item deleted',
  revision_logged: 'Revision logged', revision_deleted: 'Revision deleted',
  status_changed: 'Status changed', package_generated: 'Package generated',
};

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AuditTrail() {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterProject, setFilterProject] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filterProject) params.project_id = filterProject;
    getAuditLog(params)
      .then(data => setEntries([...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterProject]);

  useEffect(() => { getProjects().then(setProjects).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb="Submittals / Audit Trail" cta={null} />
      {error && <ErrorBanner message={error} />}

      <h1 className="display" style={{ margin: '32px 0 24px' }}>Audit trail.</h1>

      <div style={{ marginBottom: 20 }}>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          style={{ border: '1px solid #D0C9B8', borderRadius: 4, padding: '6px 10px', fontSize: 13 }}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingDot messages={['Loading audit trail…']} />
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 16, fontFamily: '"Cormorant Garamond", serif' }}>No activity yet.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {entries.map((e, i) => {
            let detail = null;
            try { detail = e.detail ? JSON.parse(e.detail) : null; } catch {}
            const detailStr = detail
              ? (detail.from && detail.to
                  ? `Status: ${detail.from} → ${detail.to}`
                  : Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join(', '))
              : null;
            return (
              <div key={e.id} style={{ display: 'flex', gap: 16, padding: '14px 20px', borderBottom: i < entries.length - 1 ? '1px solid rgba(0,0,0,0.05)' : undefined }}>
                <div style={{ fontSize: 12, color: 'var(--smoke)', whiteSpace: 'nowrap', minWidth: 70 }}
                     title={new Date(e.created_at).toLocaleString()}>
                  {relativeTime(e.created_at)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{ACTION_LABELS[e.action] || e.action}</div>
                  {detailStr && <div style={{ fontSize: 12, color: 'var(--smoke)', marginTop: 2 }}>{detailStr}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
