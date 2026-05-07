import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItem, getProject, generatePackage, getFileUrl } from '../api/projects.js';
import { draftCompliance } from '../api/ai.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function BuildPackage() {
  const { id, itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [statement, setStatement] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([getItem(id, itemId), getProject(id)])
      .then(([i, p]) => { setItem(i); setProject(p); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, itemId]);

  // all uploaded files across all revisions
  const allFiles = useMemo(() => (item?.revisions || []).flatMap(rev => {
    const files = (() => { try { return JSON.parse(rev.uploaded_files || '[]'); } catch { return []; } })();
    return files.map(f => ({ revId: rev.id, revNum: rev.revision_number, filename: f, key: `${rev.id}::${f}` }));
  }), [item]);

  function toggleFile(key) {
    setSelectedFiles(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function handleDraftAI() {
    if (!item) return;
    setDrafting(true);
    setError(null);
    try {
      const result = await draftCompliance(item.spec_section || '', '', item.scope_item, '');
      setStatement(result.statement);
    } catch (e) { setError(e.message); }
    finally { setDrafting(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const names = selectedFiles.map(k => filenameFromKey(k));
      const response = await generatePackage(id, itemId, { selectedFiles: names, complianceStatement: statement });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to generate transmittal');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `transmittal-${itemId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  }

  function filenameFromKey(k) {
    const sep = k.indexOf('::');
    return sep === -1 ? k : k.slice(sep + 2);
  }

  if (loading) return <div style={{ padding: 32 }}><LoadingDot messages={['Loading…']} /></div>;
  if (!item || !project) return <div style={{ padding: 32 }}><ErrorBanner message="Not found." /></div>;

  const inputStyle = { width: '100%', border: '1px solid #D0C9B8', borderRadius: 4, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 6, display: 'block' };

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb={`Submittals / Projects / ${item.scope_item} / Package`}
        cta={<button className="btn-secondary" onClick={() => navigate(`/projects/${id}/items/${itemId}`)}>← Back to item</button>} />
      {error && <ErrorBanner message={error} />}

      <h1 className="display" style={{ margin: '32px 0 24px' }}>Build package.</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Col 1: Document selector */}
        <div className="card">
          <div style={labelStyle}>Select documents</div>
          {allFiles.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--smoke)' }}>No uploaded files yet.</div>
          ) : (
            <>
              <label style={{ fontSize: 12, cursor: 'pointer', marginBottom: 10, display: 'block' }}>
                <input type="checkbox"
                  checked={selectedFiles.length === allFiles.length && allFiles.length > 0}
                  onChange={e => setSelectedFiles(e.target.checked ? allFiles.map(f => f.key) : [])}
                  style={{ marginRight: 6 }} />
                Select all
              </label>
              {(item.revisions || []).slice().reverse().map(rev => {
                const files = (() => { try { return JSON.parse(rev.uploaded_files || '[]'); } catch { return []; } })();
                if (!files.length) return null;
                return (
                  <div key={rev.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--smoke)', marginBottom: 4 }}>Rev {rev.revision_number}</div>
                    {files.map(f => {
                      const key = `${rev.id}::${f}`;
                      return (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 4 }}>
                          <input type="checkbox" checked={selectedFiles.includes(key)} onChange={() => toggleFile(key)} />
                          {f}
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Col 2: Transmittal preview */}
        <div className="card">
          <div style={labelStyle}>Transmittal cover</div>
          <div style={{ fontSize: 13, color: 'var(--smoke)', lineHeight: 2, marginBottom: 16 }}>
            <div><strong>{project.name}</strong></div>
            <div>GC: {project.gc_name || '—'}</div>
            <div>Project #: {project.project_number || '—'}</div>
            <div>Spec: {item.spec_section || '—'} {item.spec_section_title || ''}</div>
            <div>Item: {item.scope_item}</div>
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Enclosed:</div>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {selectedFiles.map(k => <li key={k}>{filenameFromKey(k)}</li>)}
                </ol>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Compliance statement</label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
              value={statement} onChange={e => setStatement(e.target.value)}
              placeholder="Enter or AI-draft a compliance statement…" />
            <button className="btn-secondary" style={{ marginTop: 6, fontSize: 12 }} onClick={handleDraftAI} disabled={drafting}>
              {drafting ? 'Drafting…' : 'AI Draft Cover →'}
            </button>
          </div>
        </div>

        {/* Col 3: Actions */}
        <div className="card">
          <div style={labelStyle}>Download</div>
          <button className="btn-primary" style={{ width: '100%', marginBottom: 16 }} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Stamp & download transmittal →'}
          </button>
          {selectedFiles.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--smoke)', marginBottom: 8 }}>Individual documents</div>
              {selectedFiles.map(k => {
                const sep = k.indexOf('::');
                const revId = k.slice(0, sep);
                const filename = k.slice(sep + 2);
                return (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--charcoal)' }}>{filename}</span>
                    <a href={getFileUrl(id, itemId, revId, filename)} download style={{ fontSize: 12, color: 'var(--saffron)' }}>Download</a>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--smoke)', marginTop: 16, opacity: 0.6 }}>
            Documents download separately. Transmittal is the cover sheet only.
          </div>
        </div>
      </div>
    </div>
  );
}
