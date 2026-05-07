import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject } from '../api/projects.js';
import { getStats } from '../api/settings.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import SubmittalStatusPill from '../components/SubmittalStatusPill.jsx';

const STATUS_ORDER = ['approved','approved_as_noted','submitted','revise_and_resubmit','rejected','not_yet_submitted'];
const STATUS_COLORS = { approved:'#2E7D32', approved_as_noted:'#00695C', submitted:'#F0B429', revise_and_resubmit:'#C68C0F', rejected:'#C62828', not_yet_submitted:'#CCC' };

export default function ProjectsDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ projectsCount: 0, openSubmittalsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', gc_name: '', project_number: '', bid_date: '', contract_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getProjects(), getStats()])
      .then(([p, s]) => { setProjects(p); setStats(s); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const p = await createProject(formData);
      setProjects(prev => [p, ...prev]);
      setShowForm(false);
      setFormData({ name: '', gc_name: '', project_number: '', bid_date: '', contract_date: '' });
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const itemsThisWeek = projects.reduce((acc, p) => {
    if (!p.nearestDeadline) return acc;
    const days = (new Date(p.nearestDeadline) - new Date()) / 86400000;
    return days >= 0 && days <= 7 ? acc + (p.itemCount || 0) : acc;
  }, 0);

  const labelStyle = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', display: 'block', marginBottom: 4 };
  const inputStyle = { width: '100%', border: '1px solid #D0C9B8', borderRadius: 4, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' };
  const CTA = <button className="btn-primary" onClick={() => setShowForm(true)}>New project →</button>;

  if (loading) return <div style={{ padding: 32 }}><LoadingDot messages={['Loading projects…']} /></div>;

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb="Submittals / Projects" cta={CTA} />
      {error && <ErrorBanner message={error} />}

      <h1 className="display" style={{ margin: '32px 0 24px' }}>Your projects.</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Active projects', value: projects.length },
          { label: 'Total submittal items', value: projects.reduce((a, p) => a + (p.itemCount || 0), 0) },
          { label: 'Items due this week', value: itemsThisWeek },
        ].map(m => (
          <div key={m.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, color: 'var(--saffron)' }}>{m.value}</div>
            <div style={{ fontSize: 12, color: 'var(--smoke)', marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 20, fontWeight: 600, marginBottom: 16 }}>New project</div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Project name *</label>
                <input style={inputStyle} value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>General contractor</label>
                <input style={inputStyle} value={formData.gc_name} onChange={e => setFormData(p => ({ ...p, gc_name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Project number</label>
                <input style={inputStyle} value={formData.project_number} onChange={e => setFormData(p => ({ ...p, project_number: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Bid date</label>
                <input style={inputStyle} type="date" value={formData.bid_date} onChange={e => setFormData(p => ({ ...p, bid_date: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Contract date</label>
                <input style={inputStyle} type="date" value={formData.contract_date} onChange={e => setFormData(p => ({ ...p, contract_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create project →'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 18, fontFamily: '"Cormorant Garamond", serif', marginBottom: 10 }}>No projects yet.</div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>New project →</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {projects.map(p => {
            const total = p.itemCount || 0;
            const isOverdue = p.nearestDeadline && new Date(p.nearestDeadline) < new Date();
            return (
              <div key={p.id} className="card" style={{ cursor: 'pointer', borderLeft: isOverdue ? '3px solid var(--amber)' : undefined }}
                   onClick={() => navigate(`/projects/${p.id}`)}>
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--smoke)', marginBottom: 12 }}>
                  {p.gc_name || '—'}{p.project_number ? ` · ${p.project_number}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--smoke)', marginBottom: 10 }}>{total} item{total !== 1 ? 's' : ''}</div>
                {total > 0 && (
                  <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                    {STATUS_ORDER.map(s => {
                      const count = (p.statuses || []).find(x => x.status === s)?.n || 0;
                      if (!count) return null;
                      return <div key={s} style={{ flex: count, background: STATUS_COLORS[s] }} />;
                    })}
                  </div>
                )}
                {p.nearestDeadline && (
                  <div style={{ fontSize: 11, color: isOverdue ? 'var(--amber)' : 'var(--smoke)', fontWeight: isOverdue ? 600 : 400 }}>
                    Due {new Date(p.nearestDeadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
