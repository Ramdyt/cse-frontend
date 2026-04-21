// src/pages/Documents.jsx
import { useState, useEffect, useRef } from 'react';
import { getDocuments, uploadDocument, deleteDocument, getThemes, createTheme, deleteTheme } from '../api';

const COLORS = ['#4f7cff','#3ecf8e','#f5a623','#f56565','#7c5cfc','#ec4899','#06b6d4','#84cc16'];

function getDownloadUrlWithToken(id) {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const token = localStorage.getItem('cse_token');
  return `${BASE_URL}/documents/${id}/download?token=${token}`;
}

export default function Documents() {
  const [docs, setDocs]           = useState([]);
  const [themes, setThemes]       = useState([]);
  const [cat, setCat]             = useState('Tous');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadCat, setUploadCat] = useState('');

  // Modales
  const [showUpload, setShowUpload]         = useState(false);
  const [showDeleteDoc, setShowDeleteDoc]   = useState(null);
  const [showNewTheme, setShowNewTheme]     = useState(false);
  const [showDeleteTheme, setShowDeleteTheme] = useState(null);
  const [themeForm, setThemeForm]           = useState({ name: '', color: '#4f7cff' });
  const [saving, setSaving]                 = useState(false);
  const [showThemeFilter, setShowThemeFilter] = useState(false);
  const fileInputRef = useRef(null);

  const loadDocs = () => {
    const params = {};
    if (cat !== 'Tous') params.category = cat;
    if (search) params.search = search;
    return getDocuments(params).then(setDocs).finally(() => setLoading(false));
  };

  const loadThemes = () => getThemes().then(t => {
    setThemes(t);
    if (!uploadCat && t.length > 0) setUploadCat(t[0].name);
  });

  useEffect(() => { loadThemes(); }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(loadDocs, 300);
    return () => clearTimeout(timer);
  }, [cat, search]);

  // Upload
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const doc = await uploadDocument(selectedFile, uploadCat);
      setDocs(prev => [doc, ...prev]);
      setShowUpload(false);
      setSelectedFile(null);
    } catch (e) { alert(e.response?.data?.error || 'Erreur lors de l\'upload'); }
    finally { setUploading(false); }
  };

  const confirmDeleteDoc = async () => {
    if (!showDeleteDoc) return;
    try {
      await deleteDocument(showDeleteDoc.id);
      setDocs(prev => prev.filter(d => d.id !== showDeleteDoc.id));
      setShowDeleteDoc(null);
    } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
  };

  // Thèmes
  const saveTheme = async () => {
    if (!themeForm.name.trim()) return;
    setSaving(true);
    try {
      const t = await createTheme(themeForm.name, themeForm.color);
      setThemes(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)));
      setShowNewTheme(false);
      setThemeForm({ name: '', color: '#4f7cff' });
      if (!uploadCat) setUploadCat(t.name);
    } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const confirmDeleteTheme = async () => {
    if (!showDeleteTheme) return;
    try {
      await deleteTheme(showDeleteTheme.id);
      setThemes(prev => prev.filter(t => t.id !== showDeleteTheme.id));
      if (cat === showDeleteTheme.name) setCat('Tous');
      setShowDeleteTheme(null);
    } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setSelectedFile(file); setShowUpload(true); }
  };

  const themeFilters = ['Tous', ...themes.map(t => t.name)];

  if (loading && docs.length === 0) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Chargement…</div>;

  return (
    <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
      {dragOver && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(79,124,255,0.15)', border: '3px dashed var(--accent)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--accent)', pointerEvents: 'none' }}>
          Déposez votre fichier ici
        </div>
      )}

      {/* Barre outils */}
      <div className="doc-toolbar" style={{ marginBottom:10 }}>
        {/* Bouton filtre thème */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowThemeFilter(o=>!o)}
            className="btn btn-ghost"
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            🏷
            {cat !== 'Tous' ? (
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:8, height:8, borderRadius:'50%',
                  background: themes.find(t=>t.name===cat)?.color || 'var(--accent)', display:'inline-block' }} />
                {cat}
              </span>
            ) : 'Catégorie'}
            <span style={{ fontSize:10, opacity:0.6 }}>{showThemeFilter ? '▲' : '▼'}</span>
          </button>
          {showThemeFilter && (
            <>
              <div onClick={() => setShowThemeFilter(false)}
                style={{ position:'fixed', inset:0, zIndex:99 }} />
              <div style={{ position:'absolute', top:'110%', left:0, background:'var(--surface)',
                border:'1px solid var(--border)', borderRadius:10, zIndex:100, minWidth:200,
                boxShadow:'0 8px 32px rgba(0,0,0,0.3)', overflow:'hidden', animation:'slideUp 0.15s ease' }}>
                <button onClick={() => { setCat('Tous'); setShowThemeFilter(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    background: cat==='Tous'?'var(--surface2)':'transparent', border:'none', cursor:'pointer',
                    color: cat==='Tous'?'var(--accent)':'var(--text)', fontSize:13,
                    fontFamily:"'DM Sans',sans-serif", fontWeight:cat==='Tous'?600:400, textAlign:'left' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--border)', display:'inline-block' }} />
                  Tous
                </button>
                {themes.map(t => (
                  <div key={t.id} style={{ display:'flex', alignItems:'center' }}>
                    <button onClick={() => { setCat(t.name); setShowThemeFilter(false); }}
                      style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                        background: cat===t.name?'var(--surface2)':'transparent', border:'none', cursor:'pointer',
                        color: cat===t.name?'var(--accent)':'var(--text)', fontSize:13,
                        fontFamily:"'DM Sans',sans-serif", fontWeight:cat===t.name?600:400, textAlign:'left' }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:t.color, display:'inline-block', flexShrink:0 }} />
                      {t.name}
                    </button>
                    <button onClick={() => { setShowDeleteTheme(t); setShowThemeFilter(false); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:13, padding:'10px 10px' }}
                      onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
                      onMouseLeave={e => e.currentTarget.style.color='var(--muted)'}>🗑</button>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid var(--border)', padding:'6px 8px' }}>
                  <button onClick={() => { setShowNewTheme(true); setShowThemeFilter(false); }}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                      background:'transparent', border:'1px dashed rgba(79,124,255,0.3)', borderRadius:8,
                      cursor:'pointer', color:'var(--accent)', fontSize:13,
                      fontFamily:"'DM Sans',sans-serif", textAlign:'left' }}>
                    + Nouvelle catégorie
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <input className="search-input" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>⬆ Ajouter</button>
      </div>

      {/* Grille documents */}
      <div className="docs-grid">
        {docs.map(doc => {
          const themeColor = themes.find(t => t.name === doc.category)?.color || 'var(--accent)';
          return (
            <div key={doc.id} className="doc-card">
              <div className="doc-icon-row">
                <div className="doc-icon">{doc.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doc-name" style={{ wordBreak: 'break-word' }}>{doc.name}</div>
                  <div className="doc-meta">{doc.size}</div>
                </div>
              </div>
              <div className="doc-footer">
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{doc.uploadedBy?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR') : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: `${themeColor}22`, color: themeColor }}>
                    {doc.category}
                  </span>
                  {/* Bouton ouvrir — token dans l'URL */}
                  <a href={getDownloadUrlWithToken(doc.id)} target="_blank" rel="noreferrer"
                    className="btn btn-ghost"
                    style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}
                    title="Ouvrir / Télécharger">
                    ⬇ Ouvrir
                  </a>
                  <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => setShowDeleteDoc(doc)} title="Supprimer">
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {docs.length === 0 && !loading && (
        <div className="empty-state">
          <div className="icon">📁</div>
          <div>Aucun document{search ? ` pour "${search}"` : ''}</div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowUpload(true)}>
            Ajouter le premier document
          </button>
        </div>
      )}

      {/* ── Modal : Upload ─────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Ajouter un document</div>

            {!selectedFile ? (
              <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                <div className="upload-icon">📂</div>
                <div className="upload-text">Glissez un fichier ici ou cliquez pour parcourir</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>PDF, Word, Excel, PowerPoint, images — 20 MB max</div>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"
                  onChange={e => setSelectedFile(e.target.files[0])} />
              </div>
            ) : (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 28 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{(selectedFile.size / 1024).toFixed(0)} KB</div>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setSelectedFile(null)}>✕ Changer</button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Catégorie / Thème</label>
              {themes.length > 0 ? (
                <select className="form-select" value={uploadCat} onChange={e => setUploadCat(e.target.value)}>
                  {themes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
                  Aucun thème disponible — <button className="btn btn-ghost" style={{ fontSize: 12, padding: '2px 8px', display: 'inline-flex' }} onClick={() => { setShowUpload(false); setShowNewTheme(true); }}>Créer un thème</button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowUpload(false); setSelectedFile(null); }}>Annuler</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile || uploading || !uploadCat}>
                {uploading ? 'Upload en cours…' : 'Ajouter le document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Confirmer suppression document ─────────────────────────── */}
      {showDeleteDoc && (
        <div className="modal-overlay" onClick={() => setShowDeleteDoc(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-title">Supprimer le document</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Voulez-vous supprimer <strong style={{ color: 'var(--text)' }}>"{showDeleteDoc.name}"</strong> ?<br />
              <span style={{ color: 'var(--red)', fontSize: 13 }}>⚠️ Cette action est irréversible.</span>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDeleteDoc(null)}>Annuler</button>
              <button onClick={confirmDeleteDoc}
                style={{ background: 'var(--red)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Nouveau thème ───────────────────────────────────────────── */}
      {showNewTheme && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-title">Nouveau thème</div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={themeForm.name} autoFocus
                onChange={e => setThemeForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Juridique, Sécurité…" />
            </div>
            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setThemeForm(f => ({ ...f, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: themeForm.color === c ? '3px solid white' : '2px solid transparent', boxShadow: themeForm.color === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s' }} />
                ))}
              </div>
              {themeForm.name && (
                <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: `${themeForm.color}22`, color: themeForm.color, fontSize: 12, fontWeight: 500 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: themeForm.color, display: 'inline-block' }} />
                  {themeForm.name}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNewTheme(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveTheme} disabled={saving || !themeForm.name.trim()}>
                {saving ? '…' : 'Créer le thème'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Confirmer suppression thème ────────────────────────────── */}
      {showDeleteTheme && (
        <div className="modal-overlay" onClick={() => setShowDeleteTheme(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-title">Supprimer le thème</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Voulez-vous supprimer le thème <strong style={{ color: 'var(--text)' }}>"{showDeleteTheme?.name}"</strong> ?<br />
              <span style={{ fontSize: 13, color: 'var(--orange)' }}>⚠️ Impossible s'il est utilisé par des notes existantes.</span>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDeleteTheme(null)}>Annuler</button>
              <button onClick={confirmDeleteTheme}
                style={{ background: 'var(--red)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
