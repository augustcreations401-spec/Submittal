import { useState } from 'react';
import { createRevision } from '../api/projects.js';
import { summarizeRejection } from '../api/ai.js';
import ErrorBanner from './ErrorBanner.jsx';
import LoadingDot from './LoadingDot.jsx';

export default function LogRevisionModal({ projectId, itemId, nextRevNumber, defaultSubmittedBy, onSave, onClose }) {
  const [revNum, setRevNum] = useState(nextRevNumber);
  const [submittedDate, setSubmittedDate] = useState('');
  const [submittedBy, setSubmittedBy] = useState(defaultSubmittedBy || '');
  const [files, setFiles] = useState([]);
  const [hasResponse, setHasResponse] = useState(false);
  const [responseDate, setResponseDate] = useState('');
  const [responseStatus, setResponseStatus] = useState('submitted');
  const [reviewerComments, setReviewerComments] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSummarize() {
    if (!reviewerComments.trim()) return;
    setAiLoading(true);
    try {
      const result = await summarizeRejection(reviewerComments);
      setAiSummary(result);
    } catch (e) {
      setError(e.message);
    } finally { setAiLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('revision_number', revNum);
      if (submittedDate) fd.append('submitted_date', submittedDate);
      fd.append('submitted_by', submittedBy);
      if (hasResponse) {
        if (responseDate) fd.append('response_date', responseDate);
        fd.append('response_status', responseStatus);
        if (reviewerComments) fd.append('reviewer_comments', reviewerComments);
      }
      for (const f of files) fd.append('files', f);
      const rev = await createRevision(projectId, itemId, fd);
      onSave(rev);
    } catch (e) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  const labelStyle = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', display: 'block', marginBottom: 4 };
  const inputStyle = { width: '100%', border: '1px solid #D0C9B8', borderRadius: 4, padding: '7px 10px', fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 22, fontWeight: 600, marginBottom: 20 }}>
          Log Revision {revNum}
        </div>

        {error && <ErrorBanner message={error} />}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Revision #</label>
            <input style={inputStyle} type="number" value={revNum} onChange={e => setRevNum(Number(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>Submitted date</label>
            <input style={inputStyle} type="date" value={submittedDate} onChange={e => setSubmittedDate(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Submitted by</label>
          <input style={inputStyle} value={submittedBy} onChange={e => setSubmittedBy(e.target.value)} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Upload files</label>
          <input type="file" multiple accept=".pdf,.dwg,.docx,.xlsx,.png,.jpg"
            onChange={e => setFiles(Array.from(e.target.files))}
            style={{ fontSize: 13 }} />
          {files.length > 0 && <div style={{ fontSize: 12, color: 'var(--smoke)', marginTop: 4 }}>{files.length} file(s) selected</div>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={hasResponse} onChange={e => setHasResponse(e.target.checked)} />
            Response received?
          </label>
        </div>

        {hasResponse && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Response date</label>
                <input style={inputStyle} type="date" value={responseDate} onChange={e => setResponseDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Response status</label>
                <select style={inputStyle} value={responseStatus} onChange={e => setResponseStatus(e.target.value)}>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="approved_as_noted">Approved as noted</option>
                  <option value="rejected">Rejected</option>
                  <option value="revise_and_resubmit">Revise & resubmit</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Reviewer comments</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={reviewerComments} onChange={e => setReviewerComments(e.target.value)} />
              <button className="btn-secondary" style={{ marginTop: 6, fontSize: 12 }} onClick={handleSummarize} disabled={aiLoading || !reviewerComments.trim()}>
                {aiLoading ? 'Summarizing…' : 'Summarize →'}
              </button>
              {aiSummary && (
                <div style={{ marginTop: 10, padding: 12, background: 'var(--cream)', borderRadius: 6, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{aiSummary.summary}</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {(aiSummary.actionItems || []).map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save revision →'}
          </button>
        </div>
      </div>
    </div>
  );
}
