import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalyses, deleteAnalysis, getReportUrl } from '../api/analyses.js';
import Header from '../components/Header.jsx';
import MetricCard from '../components/MetricCard.jsx';
import StatusPill from '../components/StatusPill.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

function scoreToRating(score) {
  if (score == null) return null;
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 40) return 'Partial';
  return 'Does Not Meet';
}

export default function AnalysesDashboard() {
  const [analyses, setAnalyses] = useState([]);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();

  const load = () =>
    getAnalyses()
      .then(setAnalyses)
      .catch(e => setError(e.message));

  useEffect(() => { load(); }, []);

  const thisWeek = analyses.filter(a => {
    if (!a.created_at) return false;
    return Date.now() - new Date(a.created_at) < 7 * 86400000;
  }).length;

  const handleDelete = async () => {
    try {
      await deleteAnalysis(deleteTarget);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e.message);
      setDeleteTarget(null);
    }
  };

  const CTA = (
    <button className="btn-primary" onClick={() => navigate('/analyses/new')}>
      New analysis →
    </button>
  );

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb="Spec Match / Analyses" cta={CTA} />
      <h1 className="display" style={{ margin: '32px 0 24px' }}>Your analyses.</h1>

      {error && <ErrorBanner message={error} />}

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <MetricCard label="Total analyses" value={analyses.length} />
        <MetricCard label="This week" value={thisWeek} />
      </div>

      {analyses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="display" style={{ fontSize: 36, marginBottom: 16, opacity: 0.5 }}>No analyses yet.</div>
          <button className="btn-primary" onClick={() => navigate('/analyses/new')}>
            Run your first analysis →
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Spec File</th>
                <th>Top Match</th>
                <th>Score</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map(a => (
                <tr
                  key={a.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/analyses/${a.id}`)}
                >
                  <td style={{ fontWeight: 500 }}>{a.project_name || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.65 }}>{a.spec_filename || '—'}</td>
                  <td style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 16 }}>{a.topMatch || '—'}</td>
                  <td>
                    {a.topScore != null
                      ? <StatusPill rating={scoreToRating(a.topScore)} />
                      : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.65 }}>
                    {a.created_at ? a.created_at.slice(0, 10) : '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => navigate(`/analyses/${a.id}`)}
                      >View</button>
                      <a href={getReportUrl(a.id)} download onClick={e => e.stopPropagation()}>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>Report</button>
                      </a>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '4px 10px', color: '#c0392b', borderColor: '#c0392b' }}
                        onClick={() => setDeleteTarget(a.id)}
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message="Delete this analysis? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
