// client/src/views/ProjectDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, updateProject, deleteProject, createItem, deleteItem } from '../api/projects.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import SubmittalStatusPill from '../components/SubmittalStatusPill.jsx';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ scope_item: '', spec_section: '', spec_section_title: '', deadline: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // 'project' | itemId

  const load = () => getProject(id).then(setProject).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  async function handleDeleteProject() {
    await deleteProject(id);
    navigate('/projects');
  }

  async function handleAddItem(e) {
    e.preventDefault();
    if (!newItem.scope_item.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createItem(id, newItem);
      setNewItem({ scope_item: '', spec_section: '', spec_section_title: '', deadline: '', notes: '' });
      setShowAddItem(false);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteItem(itemId) {
    await deleteItem(id, itemId);
    load();
  }

  if (loading) return <div style={{ padding: 32 }}><LoadingDot messages={['Loading project…']} /></div>;
  if (!project) return <div style={{ padding: 32 }}><ErrorBanner message="Project not found." /></div>;

  const now = new Date();
  const labelStyle = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', display: 'block', marginBottom: 4 };
  const inputStyle = { width: '100%', border: '1px solid #D0C9B8', borderRadius: 4, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ padding: 32 }}>
      {confirmDelete === 'project' && (
        <ConfirmDialog message={`Delete project "${project.name}"? This will delete all items and uploaded files.`}
          onConfirm={handleDeleteProject} onCancel={() => setConfirmDelete(null)} />
      )}
      {confirmDelete && confirmDelete !== 'project' && (
        <ConfirmDialog message="Delete this submittal item and all its revisions?" confirmLabel="Delete"
          onConfirm={() => { handleDeleteItem(confirmDelete); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)} />
      )}

      <Header breadcrumb={`Submittals / Projects / ${project.name}`}
        cta={<button className="btn-primary" onClick={() => setShowAddItem(true)}>+ Add item</button>} />
      {error && <ErrorBanner message={error} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '32px 0 8px' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: '"Cormorant Garamond", serif', fontSize: 32, fontWeight: 600 }}>{project.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--smoke)', marginTop: 4 }}>
            {project.gc_name || '—'}{project.project_number ? ` · ${project.project_number}` : ''}{project.contract_date ? ` · ${project.contract_date}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setConfirmDelete('project')}>Delete</button>
        </div>
      </div>

      {showAddItem && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontWeight: 600, marginBottom: 14 }}>Add submittal item</div>
          <form onSubmit={handleAddItem}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Scope item *</label>
                <input style={inputStyle} value={newItem.scope_item} onChange={e => setNewItem(p => ({ ...p, scope_item: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Spec section</label>
                <input style={inputStyle} value={newItem.spec_section} onChange={e => setNewItem(p => ({ ...p, spec_section: e.target.value }))} placeholder="07 2719" />
              </div>
              <div>
                <label style={labelStyle}>Deadline</label>
                <input style={inputStyle} type="date" value={newItem.deadline} onChange={e => setNewItem(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add item →'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              {['Scope item','Spec section','Status','Deadline','Revisions','Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {project.items.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--smoke)', fontSize: 14 }}>No submittal items yet.</td></tr>
            ) : project.items.map(item => {
              const overdue = item.deadline && new Date(item.deadline) < now;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', borderLeft: overdue ? '3px solid var(--amber)' : undefined }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic' }}>{item.scope_item}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--smoke)' }}>{item.spec_section || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><SubmittalStatusPill status={item.status} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: overdue ? 'var(--amber)' : 'var(--smoke)', fontWeight: overdue ? 600 : 400 }}>{item.deadline || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--smoke)' }}>—</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="btn-secondary" style={{ fontSize: 12, marginRight: 6 }} onClick={() => navigate(`/projects/${id}/items/${item.id}`)}>View →</button>
                    <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setConfirmDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
