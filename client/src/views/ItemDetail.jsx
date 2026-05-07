import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getItem, updateItem, deleteRevision, getFileUrl } from '../api/projects.js';
import { summarizeRejection, compareResubmittal } from '../api/ai.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import LogRevisionModal from '../components/LogRevisionModal.jsx';
import SubmittalStatusPill from '../components/SubmittalStatusPill.jsx';

export default function ItemDetail() {
  const { id, itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [confirmDeleteRev, setConfirmDeleteRev] = useState(null);
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [aiComparing, setAiComparing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [settings, setSettings] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    getItem(id, itemId).then(setItem).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id, itemId]);

  useEffect(() => {
    load();
    import('../api/settings.js').then(m => m.getSettings().then(setSettings).catch(() => {}));
  }, [load]);

  async function handleDeleteRev(revId) {
    try {
      await deleteRevision(id, itemId, revId);
      load();
    } catch (e) { setError(e.message); }
  }

  async function handleSummarize() {
    const latest = item.revisions[item.revisions.length - 1];
    if (!latest?.reviewer_comments) return;
    setAiSummarizing(true); setAiResult(null); setError(null);
    try { setAiResult({ type: 'summary', data: await summarizeRejection(latest.reviewer_comments) }); }
    catch (e) { setError(e.message); }
    finally { setAiSummarizing(false); }
  }

  async function handleCompare() {
    if (item.revisions.length < 2) return;
    const revs = item.revisions;
    const a = revs[revs.length - 2], b = revs[revs.length - 1];
    setAiComparing(true); setAiResult(null); setError(null);
    try { setAiResult({ type: 'compare', data: await compareResubmittal(a.id, b.id) }); }
    catch (e) { setError(e.message); }
    finally { setAiComparing(false); }
  }

  if (loading) return <div style={{ padding: 32 }}><LoadingDot messages={['Loading item…']} /></div>;
  if (!item) return <div style={{ padding: 32 }}><ErrorBanner message="Item not found." /></div>;

  const revisions = [...(item.revisions || [])].reverse(); // newest first
  const latest = item.revisions[item.revisions.length - 1];
  const canSummarize = !!latest?.reviewer_comments;
  const canCompare = item.revisions.length >= 2;

  return (
    <div style={{ padding: 32 }}>
      {confirmDeleteRev && (
        <ConfirmDialog message="Delete this revision and its uploaded files?" confirmLabel="Delete"
          onConfirm={() => { handleDeleteRev(confirmDeleteRev); setConfirmDeleteRev(null); }}
          onCancel={() => setConfirmDeleteRev(null)} />
      )}
      {showLogModal && (
        <LogRevisionModal projectId={id} itemId={itemId}
          nextRevNumber={(item.revisions.length || 0) + 1}
          defaultSubmittedBy={settings.coordinator_name || ''}
          onSave={() => { setShowLogModal(false); load(); }}
          onClose={() => setShowLogModal(false)} />
      )}

      <Header breadcrumb={`Submittals / Projects / Item Detail`} cta={null} />
      {error && <ErrorBanner message={error} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '32px 0 24px' }}>
        <h1 style={{ margin: 0, fontFamily: '"Cormorant Garamond", serif', fontSize: 32, fontWeight: 600 }}>{item.scope_item}</h1>
        <button className="btn-secondary" onClick={() => navigate(`/projects/${id}`)}>← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 24 }}>
        {/* Left: Revision timeline */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)' }}>Revision history</div>
            <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setShowLogModal(true)}>Log revision →</button>
          </div>

          {revisions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--smoke)', fontSize: 14 }}>No revisions yet.</div>
          ) : revisions.map(rev => {
            const files = (() => { try { return JSON.parse(rev.uploaded_files || '[]'); } catch { return []; } })();
            return (
              <div key={rev.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: 'var(--charcoal)', color: 'var(--cream)', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>Rev {rev.revision_number}</span>
                    <span style={{ fontSize: 12, color: 'var(--smoke)' }}>{rev.submitted_date || '—'}</span>
                    {rev.submitted_by && <span style={{ fontSize: 12, color: 'var(--smoke)' }}>by {rev.submitted_by}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {rev.response_status && <SubmittalStatusPill status={rev.response_status} />}
                    <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => setConfirmDeleteRev(rev.id)}>Delete</button>
                  </div>
                </div>
                {rev.reviewer_comments && (
                  <div style={{ fontSize: 13, color: 'var(--smoke)', marginBottom: 8, padding: '8px 10px', background: 'var(--cream)', borderRadius: 4 }}>
                    {rev.reviewer_comments}
                  </div>
                )}
                {files.length > 0 && (
                  <div style={{ fontSize: 12 }}>
                    {files.map(f => (
                      <a key={f} href={getFileUrl(id, itemId, rev.id, f)} download
                         style={{ display: 'inline-block', marginRight: 10, color: 'var(--saffron)', textDecoration: 'underline' }}>
                        {f}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: AI Actions + metadata */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 14 }}>AI Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-secondary" onClick={handleSummarize} disabled={!canSummarize || aiSummarizing}>
                {aiSummarizing ? 'Summarizing…' : 'Summarize rejection'}
              </button>
              <button className="btn-secondary" onClick={handleCompare} disabled={!canCompare || aiComparing}>
                {aiComparing ? 'Comparing…' : 'Compare with previous →'}
              </button>
              <button className="btn-secondary" onClick={() => navigate(`/projects/${id}/items/${itemId}/package`)}>
                Build package →
              </button>
            </div>
            {aiResult && (
              <div style={{ marginTop: 14, padding: 12, background: 'var(--cream)', borderRadius: 6, fontSize: 13 }}>
                {aiResult.type === 'summary' && (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{aiResult.data.summary}</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>{(aiResult.data.actionItems || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
                  </>
                )}
                {aiResult.type === 'compare' && (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Addressed</div>
                    <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 8 }}>{(aiResult.data.addressed || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
                    {(aiResult.data.outstanding || []).length > 0 && (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Outstanding</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>{aiResult.data.outstanding.map((a, i) => <li key={i}>{a}</li>)}</ul>
                      </>
                    )}
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--smoke)' }}>{aiResult.data.summary}</div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 14 }}>Item details</div>
            <div style={{ fontSize: 13, color: 'var(--smoke)', lineHeight: 2 }}>
              <div><strong>Spec section:</strong> {item.spec_section || '—'}</div>
              <div><strong>Status:</strong> <SubmittalStatusPill status={item.status} /></div>
              <div><strong>Deadline:</strong> {item.deadline || '—'}</div>
              {item.notes && <div><strong>Notes:</strong> {item.notes}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
