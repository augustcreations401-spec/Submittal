// client/src/views/AllSubmittals.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSubmittals } from '../api/submittals.js';
import { getProjects } from '../api/projects.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import SubmittalStatusPill from '../components/SubmittalStatusPill.jsx';

const ALL_STATUSES = ['not_yet_submitted','submitted','approved','approved_as_noted','rejected','revise_and_resubmit'];

export default function AllSubmittals() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterProject) params.project_id = filterProject;
    getAllSubmittals(params)
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterStatus, filterProject]);

  useEffect(() => { getProjects().then(setProjects).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const now = new Date();

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb="Submittals / All Submittals" cta={null} />
      {error && <ErrorBanner message={error} />}

      <h1 className="display" style={{ margin: '32px 0 24px' }}>All submittals.</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_STATUSES.map(s => {
            const active = filterStatus === s;
            return (
              <button key={s}
                onClick={() => setFilterStatus(prev => prev === s ? '' : s)}
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: active ? 'var(--charcoal)' : '#E8E0D0',
                  color: active ? 'var(--cream)' : 'var(--smoke)',
                  transition: 'background 0.15s',
                }}>
                {s.replace(/_/g, ' ')}
              </button>
            );
          })}
          {filterStatus && (
            <button onClick={() => setFilterStatus('')}
              style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: '1px solid #D0C9B8', background: 'transparent', color: 'var(--smoke)' }}>
              Clear ×
            </button>
          )}
        </div>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          style={{ border: '1px solid #D0C9B8', borderRadius: 4, padding: '6px 10px', fontSize: 13 }}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingDot messages={['Loading submittals…']} />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                {['Project','Scope item','Spec section','Status','Deadline','Revisions','Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--smoke)', fontSize: 14 }}>No submittal items yet.</td></tr>
              ) : items.map(item => {
                const overdue = item.deadline && new Date(item.deadline) < now;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{item.project_name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic' }}>{item.scope_item}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--smoke)' }}>{item.spec_section || '—'}</td>
                    <td style={{ padding: '12px 16px' }}><SubmittalStatusPill status={item.status} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: overdue ? 'var(--amber)' : 'var(--smoke)', fontWeight: overdue ? 600 : 400 }}>{item.deadline || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--smoke)' }}>{item.revision_count || 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => navigate(`/projects/${item.project_id}/items/${item.id}`)}>View →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
