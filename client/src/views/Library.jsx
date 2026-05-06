import { useEffect, useState } from 'react';
import { getTds, uploadTds, deleteTds } from '../api/tds.js';
import { getCategories, createCategory } from '../api/categories.js';
import Header from '../components/Header.jsx';
import DropZone from '../components/DropZone.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingDot from '../components/LoadingDot.jsx';

export default function Library() {
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterCat, setFilterCat] = useState(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCatId, setUploadCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    const [e, c] = await Promise.all([getTds(), getCategories()]).catch(() => [[], []]);
    setEntries(e);
    setCategories(c);
    if (c.length && !uploadCatId) setUploadCatId(c[0].id);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!uploadFile) { setError('Select a PDF first.'); return; }
    let catId = uploadCatId;
    if (!catId && newCatName.trim()) {
      try {
        const cat = await createCategory(newCatName.trim());
        catId = cat.id;
      } catch (e) { setError(e.message); return; }
    }
    if (!catId) { setError('Select or create a category.'); return; }
    setUploading(true); setError(null);
    try {
      await uploadTds(uploadFile, catId);
      setShowUpload(false); setUploadFile(null); setNewCatName('');
      await load();
    } catch (e) {
      setError(e.message || 'Upload failed. Check your API key in Settings.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    await deleteTds(deleteTarget).catch(() => {});
    setDeleteTarget(null);
    load();
  };

  const visible = entries.filter(e => {
    const matchCat = !filterCat || e.category_id === filterCat;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (e.product_name || '').toLowerCase().includes(q) ||
      (e.manufacturer || '').toLowerCase().includes(q) ||
      (e.original_name || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const countByCat = (cid) => entries.filter(e => e.category_id === cid).length;

  const CTA = <button className="btn-primary" onClick={() => setShowUpload(true)}>+ Upload sheet</button>;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left filter panel */}
      <div style={{ width: 200, background: 'var(--cream)', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '24px 0', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ padding: '0 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 10 }}>Categories</div>
        {[{ id: null, name: 'All', count: entries.length }, ...categories.map(c => ({ ...c, count: countByCat(c.id) }))].map(item => (
          <button
            key={item.id || 'all'}
            onClick={() => setFilterCat(item.id)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 20px',
              background: filterCat === item.id ? 'rgba(240,180,41,0.1)' : 'none',
              border: 'none', cursor: 'pointer', fontSize: 14,
              color: filterCat === item.id ? 'var(--saffron)' : 'var(--charcoal)',
              fontWeight: filterCat === item.id ? 600 : 400,
            }}
          >
            {item.name} <span style={{ opacity: 0.45, fontSize: 12 }}>({item.count})</span>
          </button>
        ))}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Header breadcrumb="Spec Match / Library" cta={CTA} />
        <h1 className="display" style={{ margin: '32px 0 24px' }}>Your library.</h1>

        {error && <ErrorBanner message={error} />}

        <input
          type="text"
          placeholder="Search products, manufacturers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 420, padding: '9px 14px',
            border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 4,
            fontSize: 14, background: 'var(--cream)', marginBottom: 24,
          }}
        />

        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="display" style={{ fontSize: 36, marginBottom: 16, opacity: 0.45 }}>
              {entries.length === 0 ? 'No sheets yet.' : 'No results.'}
            </div>
            {entries.length === 0 && (
              <button className="btn-primary" onClick={() => setShowUpload(true)}>Upload your first sheet →</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {visible.map(e => {
              const cat = categories.find(c => c.id === e.category_id);
              return (
                <div key={e.id} className="card" style={{ position: 'relative' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 8 }}>
                    {cat?.name || 'Uncategorized'}
                  </div>
                  <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 18, color: 'var(--charcoal)', marginBottom: 2, lineHeight: 1.2 }}>
                    {e.product_name || e.original_name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.55, marginBottom: 8 }}>
                    {e.manufacturer || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--smoke)', opacity: 0.35 }}>{e.original_name}</div>
                  <button
                    onClick={() => setDeleteTarget(e.id)}
                    style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--smoke)', opacity: 0.35, lineHeight: 1 }}
                    title="Remove from library"
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 480, maxWidth: '90vw' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 24, color: 'var(--charcoal)', marginBottom: 20 }}>Upload TDS sheet</div>
            {error && <ErrorBanner message={error} />}
            <DropZone onFile={setUploadFile} label="Drop TDS PDF here" />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--smoke)' }}>Category</div>
              <select
                value={uploadCatId}
                onChange={e => { setUploadCatId(e.target.value); setNewCatName(''); }}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 4, fontSize: 14, background: 'var(--cream)', marginBottom: 8 }}
              >
                <option value="">— select existing —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="Or type a new category name…"
                value={newCatName}
                onChange={e => { setNewCatName(e.target.value); setUploadCatId(''); }}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 4, fontSize: 14, background: 'var(--cream)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => { setShowUpload(false); setError(null); }}>Cancel</button>
              {uploading
                ? <LoadingDot messages={['Uploading…', 'Extracting text…', 'Identifying product…']} />
                : <button className="btn-primary" onClick={handleUpload}>Upload sheet</button>
              }
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message="Remove this sheet from the library?"
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
