import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getAnalysis, compareSheets } from '../api/analyses.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function CompareSheets() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tdsIdA = searchParams.get('a');
  const tdsIdB = searchParams.get('b');

  const [attributes, setAttributes] = useState(null);
  const [nameA, setNameA] = useState('Sheet A');
  const [nameB, setNameB] = useState('Sheet B');
  const [loading, setLoading] = useState(true);
  const [hideIdentical, setHideIdentical] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tdsIdA || !tdsIdB) {
      setError('Missing sheet IDs in URL. Return to results and click Compare on a product.');
      setLoading(false);
      return;
    }

    getAnalysis(id).then(a => {
      const ranked = a.results?.rankedProducts || [];
      const pA = ranked.find(p => p.tdsId === tdsIdA);
      const pB = ranked.find(p => p.tdsId === tdsIdB);
      if (pA) setNameA(pA.productName);
      if (pB) setNameB(pB.productName);

      // Use cached compare_results if they match current pair
      if (
        a.compare_results &&
        a.compare_results.tdsIdA === tdsIdA &&
        a.compare_results.tdsIdB === tdsIdB &&
        a.compare_results.attributes
      ) {
        setAttributes(a.compare_results.attributes);
        setLoading(false);
      } else {
        compareSheets(id, tdsIdA, tdsIdB)
          .then(r => {
            setAttributes(r.attributes || []);
            setLoading(false);
          })
          .catch(e => {
            setError(e.message || 'Comparison failed. Check your API key in Settings.');
            setLoading(false);
          });
      }
    }).catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, [id, tdsIdA, tdsIdB]);

  const visible = hideIdentical
    ? (attributes || []).filter(a => a.differs)
    : (attributes || []);

  const CTA = (
    <button className="btn-primary" onClick={() => navigate(`/analyses/${id}/export`)}>
      Approve A →
    </button>
  );

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb="Spec Match / Analyses / Compare" cta={CTA} />

      <h1 className="display" style={{ margin: '32px 0 8px' }}>Compare sheets.</h1>
      <div style={{ color: 'var(--smoke)', opacity: 0.55, fontSize: 13, marginBottom: 24 }}>
        {nameA} vs {nameB}
      </div>

      {error && <ErrorBanner message={error} />}

      {!error && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={hideIdentical}
              onChange={e => setHideIdentical(e.target.checked)}
              style={{ accentColor: 'var(--saffron)' }}
            />
            Hide identical
          </label>
        </div>
      )}

      {loading ? (
        <LoadingDot messages={['Comparing sheets…', 'Extracting attributes…']} />
      ) : !error && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Attribute</th>
                <th style={{ width: '30%' }}>
                  <span style={{
                    background: 'rgba(240,180,41,0.15)', color: 'var(--amber)',
                    borderRadius: 4, padding: '2px 8px', fontSize: 11, marginRight: 6, fontWeight: 600,
                  }}>RECOMMENDED</span>
                  {nameA}
                </th>
                <th style={{ width: '30%' }}>{nameB}</th>
                <th style={{ width: '15%' }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', opacity: 0.45, padding: 32 }}>
                    {hideIdentical ? 'No differences found.' : 'No attributes extracted.'}
                  </td>
                </tr>
              ) : (
                visible.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, fontSize: 14 }}>{row.attribute}</td>
                    <td style={{ fontSize: 14 }}>{row.sheetA || '—'}</td>
                    <td style={{ fontSize: 14 }}>{row.sheetB || '—'}</td>
                    <td>
                      {row.differs ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--saffron)', display: 'inline-block', flexShrink: 0 }} />
                          differs
                        </span>
                      ) : (
                        <span style={{ color: 'var(--smoke)', opacity: 0.4, fontSize: 13 }}>— same</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
