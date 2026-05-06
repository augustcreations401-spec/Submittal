import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnalysis } from '../api/analyses.js';
import Header from '../components/Header.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingDot from '../components/LoadingDot.jsx';

export default function AnalysisResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAnalysis(id)
      .then(setAnalysis)
      .catch(e => setError(e.message));
  }, [id]);

  if (error) return <div style={{ padding: 32 }}><ErrorBanner message={error} /></div>;
  if (!analysis) return <div style={{ padding: 32 }}><LoadingDot messages={['Loading results…']} /></div>;

  const ranked = analysis.results?.rankedProducts || [];
  const top = ranked[0];

  const handleCompare = (product) => {
    if (!top) return;
    navigate(`/analyses/${id}/compare?a=${top.tdsId}&b=${product.tdsId}`);
  };

  const CTA = (
    <button className="btn-primary" onClick={() => navigate(`/analyses/${id}/export`)}>
      Stamp & Submit →
    </button>
  );

  return (
    <div style={{ padding: 32 }}>
      <Header
        breadcrumb={`Spec Match / Analyses / ${analysis.project_name || id}`}
        cta={CTA}
      />

      <h1 className="display" style={{ margin: '32px 0 8px' }}>
        {analysis.project_name || 'Analysis'}
      </h1>
      <div style={{ color: 'var(--smoke)', opacity: 0.55, fontSize: 13, marginBottom: 32 }}>
        {analysis.spec_filename}{ranked.length > 0 ? ` · ${ranked.length} products compared` : ''}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
        {/* Left: spec text */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 12 }}>
            Specification
          </div>
          <div className="card">
            {analysis.spec_text ? (
              <pre style={{
                whiteSpace: 'pre-wrap', fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 13, color: 'var(--smoke)', margin: 0, lineHeight: 1.7,
                maxHeight: 600, overflowY: 'auto',
              }}>
                {analysis.spec_text.slice(0, 4000)}
                {analysis.spec_text.length > 4000 ? '\n\n[…truncated for display]' : ''}
              </pre>
            ) : (
              <div style={{ color: 'var(--smoke)', opacity: 0.5, fontSize: 14 }}>Spec text not available.</div>
            )}
          </div>
        </div>

        {/* Right: matches */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 12 }}>
            Matches
          </div>
          {ranked.length === 0 ? (
            <div style={{ color: 'var(--smoke)', opacity: 0.5, fontSize: 14 }}>
              No products matched. Ensure your library has sheets in the selected categories.
            </div>
          ) : (
            ranked.map((p, i) => (
              <ProductCard
                key={p.tdsId}
                product={p}
                rank={i}
                onCompare={handleCompare}
                onApprove={() => {}}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
