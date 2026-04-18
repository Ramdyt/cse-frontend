// src/pages/Admin.jsx
import { useState, useEffect } from 'react';
import { getUsers, approveUser, deleteUser, resetPassword, updateUser, getThemes, createTheme, deleteTheme } from '../api';
import { useAuth } from '../context';

const ROLES  = ['Membre', 'Secrétaire', 'Trésorier', 'Délégué syndicat'];
const COLORS = ['#4f7cff','#3ecf8e','#f5a623','#f56565','#7c5cfc','#ec4899','#06b6d4','#84cc16'];

function Avatar({ user }) {
  return <div className="avatar sm">{user?.avatar || user?.name?.slice(0,2).toUpperCase()}</div>;
}
function Toast({ msg, type }) {
  if (!msg) return null;
  const c = type === 'error' ? ['rgba(245,101,101,0.1)','rgba(245,101,101,0.3)','var(--red)'] : ['rgba(62,207,142,0.1)','rgba(62,207,142,0.3)','var(--green)'];
  return <div style={{ background: c[0], border: `1px solid ${c[1]}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: c[2], animation: 'slideUp 0.2s ease' }}>{msg}</div>;
}

export default function Admin() {
  const { user: me } = useAuth();
  const [tab, setTab]       = useState('users');
  const [users, setUsers]   = useState([]);
  const [pending, setPending] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState({ msg:'', type:'success' });
  const [showReset, setShowReset]   = useState(null);
  const [showTheme, setShowTheme]   = useState(false);
  const [resetPwd, setResetPwd]     = useState('');
  const [themeForm, setThemeForm]   = useState({ name:'', color:'#4f7cff' });
  const [showPwd, setShowPwd]       = useState(false);
  const [saving, setSaving]         = useState(false);

  const notify = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg:'', type:'success' }), 4000); };

  const load = async () => {
    try {
      const [u, p, t] = await Promise.all([getUsers(), getUsers({ pending: 1 }), getThemes()]);
      setUsers(u); setPending(p); setThemes(t);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (!me?.is_admin) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 18, fontFamily: "'Fraunces', serif" }}>Accès réservé à l'administrateur</div>
    </div>
  );

  const handleApprove = async (user) => {
    await approveUser(user.id);
    notify(`✅ Compte de ${user.name} approuvé`);
    load();
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Supprimer le compte de ${user.name} ?`)) return;
    try { await deleteUser(user.id); setUsers(prev => prev.filter(u => u.id !== user.id)); notify(`🗑 ${user.name} supprimé`); }
    catch (e) { notify(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleUpdate = async (user, changes) => {
    try {
      const updated = await updateUser(user.id, changes);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
      notify('✅ Mis à jour');
    } catch (e) { notify(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleReset = async () => {
    if (resetPwd.length < 6) return;
    setSaving(true);
    try { await resetPassword(showReset.id, resetPwd); setShowReset(null); setResetPwd(''); notify('✅ Mot de passe réinitialisé'); }
    catch (e) { notify(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleCreateTheme = async () => {
    if (!themeForm.name.trim()) return;
    setSaving(true);
    try { const t = await createTheme(themeForm.name, themeForm.color); setThemes(prev => [...prev, t]); setShowTheme(false); notify(`✅ Thème "${t.name}" créé`); }
    catch (e) { notify(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeleteTheme = async (t) => {
    if (!window.confirm(`Supprimer "${t.name}" ?`)) return;
    try { await deleteTheme(t.id); setThemes(prev => prev.filter(x => x.id !== t.id)); notify(`🗑 Thème supprimé`); }
    catch (e) { notify(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const genPwd = () => { const c='abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#'; return Array.from({length:12},()=>c[Math.floor(Math.random()*c.length)]).join(''); };

  if (loading) return <div style={{ textAlign:'center', padding:60, color:'var(--muted)' }}>Chargement…</div>;

  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} />

      {/* Onglets */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[['users',`👥 Membres (${users.length})`],['pending',`⏳ En attente (${pending.length})`],['themes','🏷 Thèmes']].map(([id,label]) => (
          <button key={id} className={`theme-tab ${tab===id?'active':''}`} onClick={() => setTab(id)} style={{ fontSize:13, padding:'8px 18px' }}>{label}</button>
        ))}
      </div>

      {/* ── MEMBRES ── */}
      {tab === 'users' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div className="section-title" style={{ marginBottom:0 }}>Membres actifs</div>
          </div>
          {/* En-tête */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1.5fr 120px 100px 80px', padding:'8px 14px', fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--border)' }}>
            <span>Nom</span><span>Email</span><span>Rôle</span><span>Statut</span><span>Admin</span><span style={{ textAlign:'right' }}>Actions</span>
          </div>

          {users.map(user => {
            const isMe = user.id === me?.id;
            return (
              <div key={user.id} style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1.5fr 120px 100px 80px', padding:'12px 14px', alignItems:'center', borderBottom:'1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Avatar user={user} />
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>
                      {user.name}
                      {isMe && <span style={{ fontSize:10, color:'var(--accent)', marginLeft:6, background:'rgba(79,124,255,0.15)', padding:'2px 6px', borderRadius:10 }}>Moi</span>}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize:13, color:'var(--muted)' }}>{user.email}</div>

                {/* Rôle + Titulaire/Suppléant */}
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {isMe ? (
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{user.role}</span>
                  ) : (
                    <select value={user.role} onChange={e => handleUpdate(user, { role: e.target.value })}
                      style={{ background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:6, padding:'3px 6px', fontSize:11, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  )}
                </div>

                {/* Titulaire / Suppléant */}
                <div>
                  {!isMe ? (
                    <div style={{ display:'flex', gap:6 }}>
                      {[['Titulaire', true],['Suppléant', false]].map(([label, val]) => (
                        <button key={label} onClick={() => handleUpdate(user, { titulaire: val })}
                          style={{ padding:'3px 8px', fontSize:10, border:`1px solid ${user.titulaire===val ? 'var(--accent)' : 'var(--border)'}`, borderRadius:6, background: user.titulaire===val ? 'rgba(79,124,255,0.15)' : 'transparent', color: user.titulaire===val ? 'var(--accent)' : 'var(--muted)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize:11, color:'var(--muted)' }}>{user.titulaire ? 'Titulaire' : 'Suppléant'}</span>
                  )}
                </div>

                {/* Admin toggle */}
                <div>
                  {!isMe ? (
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12 }}>
                      <input type="checkbox" checked={!!user.is_admin} onChange={e => handleUpdate(user, { is_admin: e.target.checked })} />
                      <span style={{ color: user.is_admin ? 'var(--accent)' : 'var(--muted)' }}>Admin</span>
                    </label>
                  ) : (
                    <span style={{ fontSize:11, color:'var(--accent)' }}>👑 Admin</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display:'flex', justifyContent:'flex-end', gap:4 }}>
                  {!isMe && (
                    <>
                      <button className="btn btn-ghost" style={{ fontSize:11, padding:'4px 8px' }} onClick={() => { setShowReset(user); setResetPwd(''); setShowPwd(false); }} title="Réinitialiser MDP">🔑</button>
                      <button className="btn btn-danger" style={{ fontSize:11, padding:'4px 8px' }} onClick={() => handleDelete(user)}>🗑</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── EN ATTENTE ── */}
      {tab === 'pending' && (
        <div className="card">
          <div className="section-title">Comptes en attente de validation</div>
          {pending.length === 0 ? (
            <div className="empty-state"><div className="icon">✅</div><div>Aucun compte en attente</div></div>
          ) : pending.map(user => (
            <div key={user.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
              <Avatar user={user} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{user.name}</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>{user.email} · {user.role}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary" style={{ fontSize:12 }} onClick={() => handleApprove(user)}>✅ Approuver</button>
                <button className="btn btn-danger" style={{ fontSize:12 }} onClick={() => handleDelete(user)}>❌ Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── THÈMES ── */}
      {tab === 'themes' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div className="section-title" style={{ marginBottom:0 }}>Thèmes des notes</div>
            <button className="btn btn-primary" onClick={() => { setThemeForm({ name:'', color:'#4f7cff' }); setShowTheme(true); }}>+ Nouveau thème</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
            {themes.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, borderLeft:`4px solid ${t.color}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:t.color }} />
                  <span style={{ fontSize:13, fontWeight:500 }}>{t.name}</span>
                </div>
                <button className="btn btn-danger" style={{ fontSize:11, padding:'2px 7px' }} onClick={() => handleDeleteTheme(t)}>🗑</button>
              </div>
            ))}
          </div>
          {themes.length === 0 && <div className="empty-state"><div className="icon">🏷</div><div>Aucun thème</div></div>}
          <div style={{ marginTop:14, fontSize:13, color:'var(--muted)', padding:'10px 14px', background:'rgba(245,166,35,0.06)', border:'1px solid rgba(245,166,35,0.2)', borderRadius:8 }}>
            ⚠️ Les thèmes peuvent aussi être créés directement depuis la page Notes par tous les membres. Seul l'admin peut les supprimer.
          </div>
        </div>
      )}

      {/* Modal reset MDP */}
      {showReset && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:400 }}>
            <div className="modal-title">Réinitialiser le mot de passe</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>Compte : <strong style={{ color:'var(--text)' }}>{showReset.name}</strong></div>
            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <input className="form-input" type={showPwd?'text':'password'} value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="Min. 6 caractères" style={{ paddingRight:40 }} autoFocus />
                  <button onClick={() => setShowPwd(p => !p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--muted)' }}>{showPwd?'🙈':'👁'}</button>
                </div>
                <button className="btn btn-ghost" style={{ fontSize:12, whiteSpace:'nowrap' }} onClick={() => { setResetPwd(genPwd()); setShowPwd(true); }}>🎲</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowReset(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleReset} disabled={saving||resetPwd.length<6}>{saving?'…':'Réinitialiser'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nouveau thème */}
      {showTheme && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:380 }}>
            <div className="modal-title">Nouveau thème</div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={themeForm.name} autoFocus onChange={e => setThemeForm(f => ({...f, name:e.target.value}))} placeholder="Ex: Juridique, Sécurité…" />
            </div>
            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setThemeForm(f => ({...f, color:c}))}
                    style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border: themeForm.color===c ? '3px solid white' : '2px solid transparent', boxShadow: themeForm.color===c ? `0 0 0 2px ${c}` : 'none', transition:'all 0.15s' }} />
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowTheme(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCreateTheme} disabled={saving||!themeForm.name.trim()}>{saving?'…':'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
