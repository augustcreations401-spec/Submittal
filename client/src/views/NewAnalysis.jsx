import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../api/categories.js';
import { runAnalysis } from '../api/analyses.js';
import Header from '../components/Header.jsx';
import DropZone from '../components/DropZone.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const LOADING_MSGS = ['Reading spec…', 'Comparing products…', 'Ranking results…'];

export default function NewAnalysis() {
  const [projectName, setProjectName] = useState('');
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [specFile, setSpecFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const toggle = (id) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const submit = async () => {
    if (!projectName.trim()) { setError('Enter a project name.'); return; }
    if (selected.length === 0) { setError('Select at least one category.'); return; }
    if (!specFile) { setError('Upload a spec PDF.'); return; }
    setLoading(true); setError(null);
    try {
      const result = await runAnalysis(projectName.trim(), selected, specFile);
      if (result.id) {
        navigate(`/analyses/${result.id}`);
      } else {
        setError(result.error || 'Analysis failed. Check your API key in Settings.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <Header breadcrumb="Spec Match / Analyses / New" />
      <h1 className="display" style={{ margin: '32px 0 32px' }}>New analysis.</h1>

      {error && <ErrorBanner message={error} />}

      {/* Step 1: Project name */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 10 }}>
          Step 1 — Project name
        </div>
        <input
          type="text"
          placeholder="e.g. 450 Main Street Plaza"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px',
            border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 4,
            fontSize: 16, background: 'var(--cream)', color: 'var(--charcoal)',
            outline: 'none',
          }}
        />
      </div>

      {/* Step 2: Categories */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)' }}>
            Step 2 — Categories
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setSelected(categories.map(c => c.id))}>
              Select all
            </button>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setSelected([])}>
              Deselect all
            </button>
          </div>
        </div>
        {categories.length === 0 ? (
          <div style={{ color: 'var(--smoke)', opacity: 0.5, fontSize: 14 }}>
            No categories yet. Upload a TDS sheet in Library first.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {categories.map(c => (
              <CategoryCard key={c.id} category={c} selected={selected.includes(c.id)} onToggle={toggle} />
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Spec PDF */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 10 }}>
          Step 3 — Spec PDF
        </div>
        <DropZone onFile={setSpecFile} label="Drop spec section PDF here" />
      </div>

      {loading ? (
        <LoadingDot messages={LOADING_MSGS} />
      ) : (
        <button className="btn-primary" style={{ fontSize: 15, padding: '11px 28px' }} onClick={submit}>
          Run analysis →
        </button>
      )}
    </div>
  );
}
