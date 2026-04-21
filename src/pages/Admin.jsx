// src/pages/Admin.jsx
import { useState, useEffect } from 'react';
import { getUsers, approveUser, deleteUser, resetPassword, updateUser } from '../api';
import { useAuth } from '../context';

const ROLES = ['Membre', 'Secrétaire', 'Trésorier', 'Délégué syndicat'];

function Avatar({ user }) {
  return <div className="avatar">{user?.avatar || user?.name?.slice(0,2).toUpperCase()}</div>;
}
function Toast({ msg, type }) {
  if (!msg) return null;
  const c = type === 'error'
    ? ['rgba(245,101,101,0.1)','rgba(245,101,101,0.3)','var(--red)']
    : ['rgba(62,207,142,0.1)','rgba(62,207,142,0.3)','var(--green)'];
  return <div style={{ background:c[0], border:`1px solid ${c[1]}`, borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:14, color:c[2], animation:'slideUp 0.2s ease' }}>{msg}</div>;
}

function genPwd() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  return Array.from({length:12}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}

export default function Admin() {
  const { user: me } = useAuth();
  const [tab, setTab]           = useState('users');
  const [users, setUsers]       = useState([]);
  const [pending, setPending]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState({ msg:'', type:'success' });

  // Modal reset MDP
  const [showReset, setShowReset] = useState(null);
  const [resetPwd, setResetPwd]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [saving, setSaving]       = useState(false);

  // Card membre ouverte (profil détaillé)
  const [openCard, setOpenCard] = useState(null);

  // Modal modifier mon profil admin
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [myProfileForm, setMyProfileForm] = useState({ role:'', titulaire: true });
  const [myPwdForm, setMyPwdForm]         = useState({ pwd:'', showPwd: false });
  const [savingProfile, setSavingProfile] = useState(false);

  const notify = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'success' }), 4000);
  };

  const load = async () => {
    try {
      const [u, p] = await Promise.all([getUsers(), getUsers({ pending: 1 })]);
      setUsers(u); setPending(p);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (!me?.is_admin) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:18, fontFamily:"'Fraunces',serif" }}>Accès réservé à l'administrateur</div>
    </div>
  );

  const handleApprove = async (user) => {
    await approveUser(user.id);
    notify(`✅ Compte de ${user.name} approuvé`);
    load();
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Supprimer le compte de ${user.name} ?`)) return;
    try {
      await deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      if (openCard === user.id) setOpenCard(null);
      notify(`🗑 ${user.name} supprimé`);
    } catch (e) { notify(e.response?.data?.error || 'Erreur', 'error'); }
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
    try {
      await resetPassword(showReset.id, resetPwd);
      setShowReset(null); setResetPwd('');
      notify('✅ Mot de passe réinitialisé');
    } catch (e) { notify(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveMyProfile = async () => {
    setSavingProfile(true);
    try {
      if (myProfileForm.role) await updateUser(me.id, { role: myProfileForm.role, titulaire: myProfileForm.titulaire });
      if (myPwdForm.pwd.length >= 6) await resetPassword(me.id, myPwdForm.pwd);
      setShowMyProfile(false);
      notify('✅ Profil mis à jour');
      load();
    } catch (e) { notify(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setSavingProfile(false); }
  };

  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} />

      {/* ── Onglets ── */}
      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {[
          ['users',   `👥 Membres (${users.length})`],
          ['pending', `⏳ En attente (${pending.length})`],
        ].map(([id, label]) => (
          <button key={id} className={`theme-tab ${tab===id?'active':''}`}
            onClick={() => setTab(id)} style={{ fontSize:13, padding:'8px 18px' }}>
            {label}
          </button>
        ))}
        {/* Bouton modifier mon profil */}
        <button className="btn btn-ghost" style={{ marginLeft:'auto', fontSize:12 }}
          onClick={() => {
            setMyProfileForm({ role: me.role, titulaire: me.titulaire });
            setMyPwdForm({ pwd:'', showPwd:false });
            setShowMyProfile(true);
          }}>
          ✏️ Mon profil
        </button>
      </div>

      {/* ── MEMBRES — Cards ── */}
      {tab === 'users' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12 }}>
          {users.map(user => {
            const isMe   = user.id === me?.id;
            const isOpen = openCard === user.id;
            return (
              <div key={user.id} className="card" style={{ padding:0, overflow:'hidden',
                border:`1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`, transition:'border 0.15s' }}>

                {/* En-tête de la carte — cliquable */}
                <div onClick={() => setOpenCard(isOpen ? null : user.id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                    cursor:'pointer', background: isOpen ? 'var(--surface2)' : 'transparent',
                    transition:'background 0.15s' }}>
                  <Avatar user={user} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                      {user.name}
                      {isMe && <span style={{ fontSize:10, color:'var(--accent)', background:'rgba(79,124,255,0.15)', padding:'2px 6px', borderRadius:10 }}>Moi</span>}
                      {user.is_admin && <span style={{ fontSize:10, color:'var(--orange)', background:'rgba(245,166,35,0.15)', padding:'2px 6px', borderRadius:10 }}>👑 Admin</span>}
                    </div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:2, display:'flex', gap:8 }}>
                      <span>{user.role}</span>
                      <span>·</span>
                      <span style={{ color: user.titulaire ? 'var(--accent)' : 'var(--accent2)' }}>
                        {user.titulaire ? 'Titulaire' : 'Suppléant'}
                      </span>
                    </div>
                  </div>
                  <span style={{ color:'var(--muted)', fontSize:16, transition:'transform 0.2s',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </div>

                {/* Détail de la carte — déplié */}
                {isOpen && (
                  <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontSize:12, color:'var(--muted)', margin:'12px 0 14px', wordBreak:'break-all' }}>
                      📧 {user.email}
                    </div>

                    {!isMe && (
                      <>
                        {/* Rôle */}
                        <div className="form-group">
                          <label className="form-label">Rôle</label>
                          <select className="form-select" value={user.role}
                            onChange={e => handleUpdate(user, { role: e.target.value })}>
                            {ROLES.map(r => <option key={r}>{r}</option>)}
                          </select>
                        </div>

                        {/* Statut Titulaire / Suppléant */}
                        <div className="form-group">
                          <label className="form-label">Statut</label>
                          <div style={{ display:'flex', gap:6 }}>
                            {[['Titulaire', true], ['Suppléant', false]].map(([label, val]) => (
                              <button key={label} onClick={() => handleUpdate(user, { titulaire: val })}
                                style={{ flex:1, padding:'7px 10px', fontSize:12, textAlign:'center',
                                  border:`1px solid ${user.titulaire===val ? 'var(--accent)' : 'var(--border)'}`,
                                  borderRadius:8, background: user.titulaire===val ? 'rgba(79,124,255,0.15)' : 'transparent',
                                  color: user.titulaire===val ? 'var(--accent)' : 'var(--muted)',
                                  cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Admin toggle */}
                        <div className="form-group">
                          <label className="form-label">Droits</label>
                          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                            <input type="checkbox" checked={!!user.is_admin}
                              onChange={e => handleUpdate(user, { is_admin: e.target.checked })} />
                            <span style={{ color: user.is_admin ? 'var(--accent)' : 'var(--muted)' }}>
                              Administrateur
                            </span>
                          </label>
                        </div>

                        {/* Actions */}
                        <div style={{ display:'flex', gap:8, marginTop:8 }}>
                          <button className="btn btn-ghost" style={{ flex:1, fontSize:12 }}
                            onClick={() => { setShowReset(user); setResetPwd(''); setShowPwd(false); }}>
                            🔑 Réinitialiser MDP
                          </button>
                          <button className="btn btn-danger" style={{ fontSize:12, padding:'8px 12px' }}
                            onClick={() => handleDelete(user)}>
                            🗑
                          </button>
                        </div>
                      </>
                    )}

                    {isMe && (
                      <div style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic', paddingTop:4 }}>
                        Pour modifier votre profil, utilisez le bouton "✏️ Mon profil" en haut.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="empty-state"><div className="icon">👥</div><div>Aucun membre</div></div>
          )}
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

      {/* ── MODAL : Reset MDP ── */}
      {showReset && (
        <div className="modal-overlay">
          <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:400 }}>
            <div className="modal-title">Réinitialiser le mot de passe</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>
              Compte : <strong style={{ color:'var(--text)' }}>{showReset.name}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <input className="form-input" type={showPwd?'text':'password'} value={resetPwd}
                    onChange={e=>setResetPwd(e.target.value)} placeholder="Min. 6 caractères"
                    style={{ paddingRight:40 }} autoFocus />
                  <button onClick={()=>setShowPwd(p=>!p)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--muted)' }}>
                    {showPwd?'🙈':'👁'}
                  </button>
                </div>
                <button className="btn btn-ghost" style={{ fontSize:12 }}
                  onClick={()=>{ setResetPwd(genPwd()); setShowPwd(true); }}>🎲</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowReset(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleReset}
                disabled={saving||resetPwd.length<6}>{saving?'…':'Réinitialiser'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Mon profil admin ── */}
      {showMyProfile && (
        <div className="modal-overlay">
          <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:420 }}>
            <div className="modal-title">✏️ Mon profil</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>
              Modifier vos informations : <strong style={{ color:'var(--text)' }}>{me.name}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">Rôle</label>
              <select className="form-select" value={myProfileForm.role}
                onChange={e=>setMyProfileForm(f=>({...f, role:e.target.value}))}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Statut</label>
              <div style={{ display:'flex', gap:6 }}>
                {[['Titulaire', true], ['Suppléant', false]].map(([label, val]) => (
                  <button key={label} onClick={()=>setMyProfileForm(f=>({...f, titulaire:val}))}
                    style={{ flex:1, padding:'8px', fontSize:12, textAlign:'center',
                      border:`1px solid ${myProfileForm.titulaire===val ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius:8, background: myProfileForm.titulaire===val ? 'rgba(79,124,255,0.15)' : 'transparent',
                      color: myProfileForm.titulaire===val ? 'var(--accent)' : 'var(--muted)',
                      cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nouveau mot de passe (optionnel)</label>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <input className="form-input" type={myPwdForm.showPwd?'text':'password'}
                    value={myPwdForm.pwd}
                    onChange={e=>setMyPwdForm(f=>({...f, pwd:e.target.value}))}
                    placeholder="Laisser vide pour ne pas changer"
                    style={{ paddingRight:40 }} />
                  <button onClick={()=>setMyPwdForm(f=>({...f,showPwd:!f.showPwd}))}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--muted)' }}>
                    {myPwdForm.showPwd?'🙈':'👁'}
                  </button>
                </div>
                <button className="btn btn-ghost" style={{ fontSize:12 }}
                  onClick={()=>setMyPwdForm(f=>({...f, pwd:genPwd(), showPwd:true}))}>🎲</button>
              </div>
              {myPwdForm.pwd.length > 0 && myPwdForm.pwd.length < 6 && (
                <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>Min. 6 caractères</div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowMyProfile(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSaveMyProfile}
                disabled={savingProfile || (myPwdForm.pwd.length > 0 && myPwdForm.pwd.length < 6)}>
                {savingProfile ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
