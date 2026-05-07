import { useState, useEffect } from 'react';
import { getProjects, createProject, createItem } from '../api/projects.js';
import ErrorBanner from './ErrorBanner.jsx';

export default function SaveToProjectModal({ analysisId, analysisName, onSave, onSkip, onClose }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { getProjects().then(setProjects).catch(() => {}); }, []);

  const isNewProject = selectedProjectId === '__new__';
  const inputStyle = { width: '100%', border: '1px solid #D0C9B8', borderRadius: 4, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', display: 'block', marginBottom: 4 };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let projectId = selectedProjectId;
      if (isNewProject) {
        if (!newProjectName.trim()) { setError('Project name required'); setSaving(false); return; }
        const p = await createProject({ name: newProjectName.trim() });
        projectId = p.id;
      }
      if (!projectId) { setError('Select a project'); setSaving(false); return; }
      const item = await createItem(projectId, {
        scope_item: analysisName || 'Untitled Analysis',
        linked_analysis_id: analysisId,
        status: 'not_yet_submitted',
      });
      onSave({ projectId, item });
    } catch (e) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ maxWidth: 440, width: '90%' }}>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Save this match to a project?</div>
        <div style={{ fontSize: 13, color: 'var(--smoke)', marginBottom: 20 }}>"{analysisName}" will be added as a submittal item.</div>

        {error && <ErrorBanner message={error} />}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Project</label>
          <select style={inputStyle} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__new__">+ Create new project</option>
          </select>
        </div>

        {isNewProject && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>New project name</label>
            <input style={inputStyle} value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name" />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn-secondary" onClick={onSkip} style={{ fontSize: 13 }}>Skip — just download</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save & download →'}
          </button>
        </div>
      </div>
    </div>
  );
}
