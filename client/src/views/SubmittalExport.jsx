import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnalysis, getReportUrl } from '../api/analyses.js';
import { getSettings } from '../api/settings.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import StatusPill from '../components/StatusPill.jsx';

function scoreToRating(score) {
  if (score == null) return 'Partial';
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 40) return 'Partial';
  return 'Does Not Meet';
}

export default function SubmittalExport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    getAnalysis(id).then(setAnalysis).catch(() => {});
    getSettings().then(setSettings).catch(() => {});
  }, [id]);

  if (!analysis) return <div style={{ padding: 32 }}><LoadingDot messages={['Preparing export…']} /></div>;

  const ranked = analysis.results?.rankedProducts || [];
  const today = new Date().toISOString().slice(0, 10);

  const CTA = (
    <a href={getReportUrl(id)} download style={{ textDecoration: 'none' }}>
      <button className="btn-primary">Stamp & download .pdf →</button>
    </a>
  );

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb="Spec Match / Analyses / Export" cta={CTA} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '32px 0 24px' }}>
        <h1 className="display" style={{ margin: 0 }}>Export package.</h1>
        <button className="btn-secondary" onClick={() => navigate(`/analyses/${id}`)}>← Back to results</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Col 1: Cover sheet */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 16 }}>Cover Sheet</div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 22, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 12 }}>
            {settings.company_name || 'Your Company'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--smoke)', lineHeight: 2.1 }}>
            <div><span style={{ opacity: 0.55, fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>Project</span><br />{analysis.project_name || '—'}</div>
            <div><span style={{ opacity: 0.55, fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>Spec File</span><br />{analysis.spec_filename || '—'}</div>
            <div><span style={{ opacity: 0.55, fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>Date</span><br />{today}</div>
            <div><span style={{ opacity: 0.55, fontWeight: 600, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>Products</span><br />{ranked.length}</div>
          </div>
        </div>

        {/* Col 2: Contents */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 16 }}>Contents</div>
          {ranked.length === 0 ? (
            <div style={{ opacity: 0.45, fontSize: 13 }}>No products matched.</div>
          ) : (
            ranked.map((p, i) => (
              <div key={p.tdsId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 15 }}>{p.productName}</span>
                <span style={{ color: 'var(--smoke)', opacity: 0.45, fontSize: 12 }}>p.{i + 2}</span>
              </div>
            ))
          )}
        </div>

        {/* Col 3: Top match detail */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 16 }}>Top Match</div>
          {ranked[0] ? (
            <>
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 20, color: 'var(--charcoal)', marginBottom: 4, lineHeight: 1.2 }}>
                {ranked[0].productName}
              </div>
              {ranked[0].manufacturer && (
                <div style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.6, marginBottom: 12 }}>{ranked[0].manufacturer}</div>
              )}
              <div style={{ marginBottom: 10 }}>
                <StatusPill rating={scoreToRating(ranked[0].score)} />
              </div>
              <div style={{ fontSize: 48, fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', color: 'var(--saffron)', lineHeight: 1 }}>
                {ranked[0].score}%
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.45, fontSize: 13 }}>No products matched.</div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--smoke)', opacity: 0.45, textAlign: 'center', marginTop: 8 }}>
        Citations generated by SpecMatch against project manual · All matches reviewed by preparer
      </div>
    </div>
  );
}
