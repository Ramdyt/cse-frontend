// src/pages/Delegation.jsx
import { useState, useEffect } from 'react';
import {
  getDelegationSummary, getDelegationEntries, createDelegationEntry, deleteDelegationEntry,
  getDelegationTransfers, createTransfer, approveTransfer,
  getDelegationConfig, updateDelegationConfig, getUsers,
  getAllDelegationEntries, adminCreateEntry, updateDelegationEntry, adjustBalance,
} from '../api';
import { useAuth } from '../context';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function Avatar({ user, size='' }) {
  return <div className={`avatar ${size}`}>{user?.avatar||user?.name?.slice(0,2).toUpperCase()}</div>;
}

function BalanceBar({ value, max, color='var(--accent)' }) {
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0;
  return (
    <div style={{ background:'var(--surface2)', borderRadius:6, height:8, overflow:'hidden', marginTop:6 }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:6, transition:'width 0.4s ease' }} />
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  const isErr = msg.startsWith('❌');
  return (
    <div style={{
      background: isErr?'rgba(245,101,101,0.1)':'rgba(62,207,142,0.1)',
      border:`1px solid ${isErr?'rgba(245,101,101,0.3)':'rgba(62,207,142,0.3)'}`,
      borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:14,
      color: isErr?'var(--red)':'var(--green)', animation:'slideUp 0.2s ease'
    }}>{msg}</div>
  );
}

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background:'rgba(245,101,101,0.08)', border:'1px solid rgba(245,101,101,0.2)', borderRadius:10, padding:'14px 18px', marginBottom:20, fontSize:13, color:'var(--red)' }}>
      ❌ {msg} — <button onClick={() => window.location.reload()} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif", textDecoration:'underline' }}>Recharger</button>
    </div>
  );
}

export default function Delegation() {
  const { user: me } = useAuth();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()+1);
  const [tab, setTab]     = useState('overview');

  const [summary, setSummary]     = useState(null);
  const [entries, setEntries]     = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [config, setConfig]       = useState(null);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');

  const [allEntries, setAllEntries]       = useState([]);
  const [showAdjust, setShowAdjust]         = useState(null); // user à ajuster
  const [adjustTarget, setAdjustTarget]     = useState('');
  const [adjustNote, setAdjustNote]         = useState('');
  const [showAdminEdit, setShowAdminEdit] = useState(null); // entry à modifier
  const [adminForm, setAdminForm]         = useState({ hours:'', date:'', description:'' });
  const [showEntry, setShowEntry]         = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showConfig, setShowConfig]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState('');

  const now_str = now.toISOString().split('T')[0];

  // Formulaire saisie — pré-rempli avec l'utilisateur connecté
  const [entryForm, setEntryForm] = useState({
    taker_id: '', source: 'own', owner_id: '', hours: '', date: now_str, description: '',
  });
  const [transferForm, setTransferForm] = useState({ from_id:'', to_id:'', hours:'', date:now_str, note:'' });
  const [configForm, setConfigForm] = useState({ hours_titulaire:20, hours_suppleant:7, max_report:30, start_year: new Date().getFullYear(), start_month: new Date().getMonth()+1, rh_email:'', smtp_host:'', smtp_port:587, smtp_user:'', smtp_pass:'' });

  const notify = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 5000); };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [u, s, e, t, cfg] = await Promise.all([
        getUsers(),
        getDelegationSummary(year, month),
        getDelegationEntries({ year, month }),
        getDelegationTransfers(),
        getDelegationConfig(),
      ]);
      setUsers(u || []);
      setSummary(s || { members: [], pool: { total:0, taken:0, remaining:0, count:0, hours_each:7 } });
      setEntries(e || []);
      setTransfers(t || []);
      if (cfg) {
        setConfig(cfg);
        setConfigForm(f => ({ ...f, ...cfg, smtp_pass:'' }));
      }
      // Admin : charger toutes les entrées
      if (me?.is_admin) {
        const all = await getAllDelegationEntries().catch(()=>[]);
        setAllEntries(all);
      }
    } catch(err) {
      console.error('Delegation load error:', err);
      setLoadError('Impossible de charger les données de délégation. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [year, month]);

  // Ouvrir le modal de saisie — toujours pour SOI-MÊME uniquement
  const openEntry = () => {
    const isTitulaire = !!me?.titulaire;
    setEntryForm({
      taker_id: String(me?.id || ''),
      source:   isTitulaire ? 'own' : 'pool',
      owner_id: isTitulaire ? String(me?.id || '') : '',
      hours:    '',
      date:     now_str,
      description: '',
    });
    setShowEntry(true);
  };

  const titulaires = users.filter(u => u.titulaire);
  const takerUser  = users.find(u => u.id == entryForm.taker_id);

  // Quand on change le bénéficiaire
  const handleTakerChange = (tid) => {
    const u = users.find(x => x.id == tid);
    setEntryForm(f => ({
      ...f,
      taker_id: tid,
      source: u?.titulaire ? 'own' : 'pool',
      owner_id: u?.titulaire ? String(tid) : '',
    }));
  };

  const saveEntry = async () => {
    if (!entryForm.hours || !entryForm.date) return;
    const isPool        = !me?.titulaire && entryForm.source === 'pool';
    const isMutualisation = entryForm.source === 'other';
    if (isMutualisation && !entryForm.owner_id) return;

    // Suppléant avec mutualisation → créer une demande de transfert, pas une entrée directe
    if (isMutualisation && !me?.titulaire) {
      setSaving(true);
      try {
        await createTransfer({
          from_id: parseInt(entryForm.owner_id),
          to_id:   parseInt(me.id),
          hours:   parseFloat(entryForm.hours),
          date:    entryForm.date,
          note:    entryForm.description || '',
        });
        setShowEntry(false);
        setEntryForm({ taker_id: String(me?.id||''), source: 'pool', owner_id:'', hours:'', date: now_str, description:'' });
        notify('✅ Demande d\'heures envoyée — le titulaire doit la valider');
        load();
      } catch(e) { notify('❌ ' + (e.response?.data?.error || 'Erreur')); }
      finally { setSaving(false); }
      return;
    }
    setSaving(true);
    try {
      await createDelegationEntry({
        taker_id:    parseInt(me.id),
        owner_id:    isPool ? null : (entryForm.source === 'other' ? parseInt(entryForm.owner_id) : parseInt(me.id)),
        is_pool:     isPool ? 1 : 0,
        hours:       parseFloat(entryForm.hours),
        date:        entryForm.date,
        description: entryForm.description || '',
      });
      setShowEntry(false);
      setEntryForm({ taker_id: String(me?.id||''), source: me?.titulaire ? 'own' : 'pool', owner_id: me?.titulaire ? String(me?.id||'') : '', hours:'', date: now_str, description:'' });
      notify('✅ Prise d\'heures enregistrée — email envoyé à la RH');
      load();
    } catch(e) {
      notify('❌ ' + (e.response?.data?.error || 'Erreur'));
    } finally { setSaving(false); }
  };

  const saveTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id || !transferForm.hours) return;
    setSaving(true);
    try {
      await createTransfer({
        ...transferForm,
        from_id: parseInt(transferForm.from_id),
        to_id:   parseInt(transferForm.to_id),
        hours:   parseFloat(transferForm.hours),
      });
      setShowTransfer(false);
      notify('✅ Demande envoyée — le titulaire doit la valider');
      load();
    } catch(e) { notify('❌ ' + (e.response?.data?.error || 'Erreur')); }
    finally { setSaving(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await updateDelegationConfig(configForm);
      setShowConfig(false);
      notify('✅ Configuration mise à jour');
      load();
    } catch { notify('❌ Erreur'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id, status) => {
    try {
      await approveTransfer(id, status);
      notify(status === 'approved' ? '✅ Demande d\'heures approuvée — email envoyé à la RH' : '❌ Demande refusée');
      load();
    } catch(e) { notify('❌ ' + (e.response?.data?.error || 'Erreur')); }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await deleteDelegationEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      notify('🗑 Entrée supprimée');
    } catch(e) { notify('❌ ' + (e.response?.data?.error || 'Erreur')); }
  };

  const balColor = (rem, tot) => {
    if (!tot) return 'var(--muted)';
    const p = rem / tot;
    return p > 0.5 ? 'var(--green)' : p > 0.2 ? 'var(--orange)' : 'var(--red)';
  };

  const pendingForMe = transfers.filter(t => t.status === 'pending' && t.from_id === me?.id);

  const getMemberBalance = (userId) => summary?.members?.find(m => m.user.id === userId)?.balance;

  if (loading) return <div style={{ textAlign:'center', padding:60, color:'var(--muted)' }}>Chargement…</div>;

  return (
    <div>
      <Toast msg={toast} />
      <ErrorBanner msg={loadError} />

      {/* ── En-tête navigation mois — pleine largeur ── */}
      <div style={{ marginBottom:16 }}>
        {/* Sélecteur de mois pleine largeur */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12,
          padding:'12px 16px', marginBottom:10 }}>
          <button onClick={() => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:22, lineHeight:1 }}>‹</button>
          <span style={{ fontSize:17, fontWeight:700, fontFamily:"'Fraunces',serif" }}>
            {MONTHS[month-1]} {year}
          </span>
          <button onClick={() => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:22, lineHeight:1 }}>›</button>
        </div>
        {/* Onglets pleine largeur */}
        <div style={{ display:'flex', gap:6, width:'100%', marginBottom:8 }}>
          {[['overview','📊 Vue d\'ensemble'],['history','📋 Historique'],['transfers','🔄 Demandes d\'heures'+(pendingForMe.length>0?` (${pendingForMe.length})`:'')] , ...(me?.is_admin ? [['admin','🛠 Admin']] : [])].map(([id,label]) => (
            <button key={id} className={`theme-tab ${tab===id?'active':''}`}
              style={{ fontSize:12, padding:'8px 6px', flex:1, textAlign:'center' }}
              onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        {/* Actions */}
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary" onClick={openEntry} style={{ fontSize:12, flex:1 }}>+ Saisir des heures</button>
          {me?.is_admin && <button className="btn btn-ghost" onClick={() => setShowConfig(true)} style={{ fontSize:12 }}>⚙️ Config</button>}
        </div>
      </div>

      {/* ── Alertes mutualisations en attente ── */}
      {pendingForMe.length > 0 && (
        <div style={{ background:'rgba(245,166,35,0.08)', border:'1px solid rgba(245,166,35,0.3)', borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--orange)', marginBottom:10 }}>
            ⏳ {pendingForMe.length} demande(s) d'heures en attente de votre validation
          </div>
          {pendingForMe.map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid rgba(245,166,35,0.2)', flexWrap:'wrap' }}>
              <div className="avatar sm">{t.to_avatar||t.to_name?.slice(0,2)}</div>
              <span style={{ flex:1, fontSize:13 }}><strong>{t.to_name}</strong> demande <strong style={{ color:'var(--orange)' }}>{t.hours}h</strong>{t.note ? ` — ${t.note}` : ''}</span>
              <button className="btn btn-primary" style={{ fontSize:12 }} onClick={() => handleApprove(t.id,'approved')}>✅ Approuver</button>
              <button className="btn btn-danger"  style={{ fontSize:12 }} onClick={() => handleApprove(t.id,'rejected')}>❌ Refuser</button>
            </div>
          ))}
        </div>
      )}

      {/* ── VUE D'ENSEMBLE ── */}
      {tab === 'overview' && (
        <div>
          {/* Pot commun suppléants */}
          {summary?.pool && (() => {
            // Le pot commun est FIXE (7h/mois par défaut), partagé entre tous les suppléants
            const suppleants  = summary.members.filter(m => !m.user.titulaire);
            const cfg_h       = summary.pool.hours_each || 7;
            const poolTotal   = Number(summary.pool.total) || cfg_h; // fixe depuis le backend
            const poolTaken   = Number(summary.pool.taken) || 0;
            const poolRemaining = Math.max(poolTotal - poolTaken, 0);
            return (
            <div className="card" style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
                <div className="section-title" style={{ marginBottom:0 }}>🫙 Pot commun — Suppléants</div>
                <div style={{ fontSize:13, color:'var(--muted)' }}>
                  Pot fixe : {poolTotal}h/mois · {suppleants.length} suppléant(s)
                </div>
              </div>
              {poolTotal === 0 ? (
                <div style={{ fontSize:13, color:'var(--muted)' }}>Aucun suppléant enregistré.</div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <BalanceBar value={poolRemaining} max={poolTotal} color="var(--accent2)" />
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:12, color:'var(--muted)' }}>
                      <span>{poolTaken}h utilisées</span>
                      <span style={{ color:'var(--accent2)', fontWeight:600 }}>{poolRemaining}h restantes</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:28, fontWeight:700, fontFamily:"'Fraunces',serif", color:'var(--accent2)' }}>{poolRemaining}h</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>/ {poolTotal}h</div>
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* Compteurs titulaires */}
          <div className="section-title">⚖️ Compteurs titulaires</div>
          {!summary?.members || summary.members.filter(m => m.user.titulaire).length === 0 ? (
            <div className="empty-state"><div className="icon">⚖️</div><div>Aucun titulaire enregistré.<br/>Allez dans Administration pour définir les membres comme Titulaires.</div></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:14, marginBottom:20 }}>
              {summary.members.filter(m => m.user.titulaire).map(({ user, balance: rawBal }) => {
                // Forcer des valeurs numériques même si le backend renvoie null/undefined
                const bal = rawBal ? {
                  allocated:       Number(rawBal.allocated)       || 20,
                  reported:        Number(rawBal.reported)        || 0,
                  total:           Number(rawBal.total)           || 20,
                  taken:           Number(rawBal.taken)           || 0,
                  transferred_out: Number(rawBal.transferred_out) || 0,
                  transferred_in:  Number(rawBal.transferred_in)  || 0,
                  remaining:       Number(rawBal.remaining)       ?? 20,
                } : { allocated:20, reported:0, total:20, taken:0, transferred_out:0, transferred_in:0, remaining:20 };

                const color = balColor(bal.remaining, bal.total);
                return (
                  <div key={user.id} className="card" style={{ borderLeft:`3px solid ${color}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                      <Avatar user={user} size="sm" />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600 }}>{user.name}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{user.role} · Titulaire</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:24, fontWeight:700, fontFamily:"'Fraunces',serif", color }}>{bal.remaining}h</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>/ {bal.total}h ce mois</div>
                      </div>
                    </div>
                    <BalanceBar value={bal.remaining} max={bal.total} color={color} />
                    <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
                      {[
                        ['Base',  `${bal.allocated}h`,       'var(--text)'],
                        bal.reported > 0        ? ['Report', `+${bal.reported}h`,        'var(--accent)'] : null,
                        ['Pris',  `${bal.taken}h`,           'var(--orange)'],
                        bal.transferred_out > 0 ? ['Donnés', `-${bal.transferred_out}h`, 'var(--red)']   : null,
                        bal.transferred_in > 0  ? ['Reçus',  `+${bal.transferred_in}h`,  'var(--green)'] : null,
                      ].filter(Boolean).map(([label, val, col]) => (
                        <div key={label} style={{ flex:'1 1 60px', textAlign:'center', padding:'6px 4px', background:'var(--surface2)', borderRadius:6 }}>
                          <div style={{ fontSize:10, color:'var(--muted)' }}>{label}</div>
                          <div style={{ fontSize:13, fontWeight:600, marginTop:2, color:col }}>{val}</div>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Suppléants */}
          {summary?.members?.filter(m => !m.user.titulaire).length > 0 && (
            <>
              <div className="section-title">👥 Suppléants</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:12 }}>
                {summary.members.filter(m => !m.user.titulaire).map(({ user }) => (
                  <div key={user.id} className="card" style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Avatar user={user} size="sm" />
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{user.name}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{user.role} · Suppléant</div>
                      <div style={{ fontSize:11, color:'var(--accent2)', marginTop:2 }}>Pot commun partagé</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTORIQUE ── */}
      {tab === 'history' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:8 }}>
            <div className="section-title" style={{ marginBottom:0 }}>Historique — {MONTHS[month-1]} {year}</div>
            <div style={{ fontSize:13, color:'var(--muted)' }}>{entries.length} entrée(s)</div>
          </div>
          {entries.length === 0 ? (
            <div className="empty-state"><div className="icon">🕐</div><div>Aucune prise d'heures ce mois</div></div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 1fr 70px 1fr 50px', minWidth:500, padding:'8px 14px', fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>
                <span>Date</span><span>Bénéficiaire</span><span>Compteur</span><span>Heures</span><span>Motif</span><span/>
              </div>
              {entries.map(e => (
                <div key={e.id} style={{ display:'grid', gridTemplateColumns:'90px 1fr 1fr 70px 1fr 50px', minWidth:500, padding:'11px 14px', alignItems:'center', borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                  onMouseEnter={ev => ev.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>{e.date}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div className="avatar xs">{e.taker_avatar||e.taker_name?.slice(0,2)}</div>
                    <span style={{ fontSize:13 }}>{e.taker_name}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {e.is_pool ? (
                      <span style={{ fontSize:11, color:'var(--accent2)', background:'rgba(124,92,252,0.12)', padding:'1px 8px', borderRadius:10 }}>🫙 Pot commun</span>
                    ) : (
                      <>
                        {e.taker_id !== e.owner_id && <span style={{ fontSize:10, color:'var(--accent)', background:'rgba(79,124,255,0.1)', padding:'1px 6px', borderRadius:10 }}>demande d'heures</span>}
                        <span style={{ fontSize:13 }}>{e.owner_name || '—'}</span>
                      </>
                    )}
                  </div>
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--orange)', fontFamily:"'Fraunces',serif" }}>{e.hours}h</span>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>{e.description||'—'}</span>
                  <div style={{ textAlign:'right' }}>
                    {(e.created_by === me?.id || me?.is_admin) && (
                      <button className="btn btn-danger" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => handleDeleteEntry(e.id)}>🗑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MUTUALISATIONS ── */}
      {tab === 'transfers' && (
        <div className="card">
          <div className="section-title">Historique des demandes d'heures</div>
          {transfers.length === 0 ? (
            <div className="empty-state"><div className="icon">🔄</div><div>Aucune demande d'heures</div></div>
          ) : transfers.map(t => {
            const sc = { pending:'var(--orange)', approved:'var(--green)', rejected:'var(--red)' };
            const sl = { pending:'⏳ En attente', approved:'✅ Approuvée', rejected:'❌ Refusée' };
            return (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' }}>
                  <div className="avatar xs">{t.to_avatar||t.to_name?.slice(0,2)}</div>
                  <span style={{ fontSize:13, fontWeight:500 }}>{t.to_name}</span>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>demande</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--orange)', fontFamily:"'Fraunces',serif" }}>{t.hours}h</span>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>de</span>
                  <div className="avatar xs">{t.from_avatar||t.from_name?.slice(0,2)}</div>
                  <span style={{ fontSize:13, fontWeight:500 }}>{t.from_name}</span>
                  {t.note && <span style={{ fontSize:12, color:'var(--muted)' }}>— {t.note}</span>}
                </div>
                <span style={{ fontSize:11, color:'var(--muted)' }}>{t.date}</span>
                <span style={{ fontSize:11, fontWeight:500, color:sc[t.status], background:`${sc[t.status]}22`, padding:'2px 10px', borderRadius:20 }}>
                  {sl[t.status]}
                </span>
              </div>
            );
          })}
        </div>
      )}


      {/* ── ONGLET ADMIN ── */}
      {tab === 'admin' && me?.is_admin && (
        <div>
          {/* Ajustement des compteurs titulaires */}
          <div className="card" style={{marginBottom:16}}>
            <div className="section-title">⚖️ Ajuster les compteurs titulaires</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:12, marginBottom:4}}>
              {(summary?.members || []).filter(m => m.user.titulaire).map(({user, balance: rawBal}) => {
                const bal = rawBal ? {remaining: Number(rawBal.remaining)||20, total: Number(rawBal.total)||20} : {remaining:20, total:20};
                const color = bal.remaining < 5 ? 'var(--red)' : bal.remaining < 10 ? 'var(--orange)' : 'var(--green)';
                return (
                  <div key={user.id} style={{display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)'}}>
                    <div className="avatar sm">{user.avatar||user.name?.slice(0,2)}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13, fontWeight:500}}>{user.name}</div>
                      <div style={{fontSize:12, color}}>{bal.remaining}h / {bal.total}h</div>
                    </div>
                    <button className="btn btn-ghost" style={{fontSize:11, padding:'4px 10px'}}
                      onClick={() => {
                        setShowAdjust(user);
                        setAdjustTarget(String(bal.remaining));
                        setAdjustNote('');
                      }}>
                      ✏️ Ajuster
                    </button>
                  </div>
                );
              })}
            </div>
            {(!summary?.members || summary.members.filter(m=>m.user.titulaire).length === 0) && (
              <div style={{fontSize:13, color:'var(--muted)'}}>Aucun titulaire à ajuster.</div>
            )}
          </div>

          {/* Correction d'une saisie existante */}
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div className="section-title" style={{marginBottom:0}}>🛠 Toutes les saisies (correction admin)</div>
              <button className="btn btn-primary" style={{fontSize:12}} onClick={() => {
                setAdminForm({ taker_id:'', owner_id:'', is_pool:false, hours:'', date:new Date().toISOString().split('T')[0], description:'[Correction admin]' });
                setShowAdminEdit('new');
              }}>+ Forcer une saisie</button>
            </div>
            {allEntries.length === 0 ? (
              <div className="empty-state"><div className="icon">📋</div><div>Aucune saisie</div></div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <div style={{display:'grid',gridTemplateColumns:'90px 1fr 1fr 70px 1fr 80px',minWidth:550,padding:'8px 14px',fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid var(--border)'}}>
                  <span>Date</span><span>Bénéficiaire</span><span>Compteur</span><span>Heures</span><span>Motif</span><span style={{textAlign:'right'}}>Actions</span>
                </div>
                {allEntries.map(e => (
                  <div key={e.id} style={{display:'grid',gridTemplateColumns:'90px 1fr 1fr 70px 1fr 80px',minWidth:550,padding:'10px 14px',alignItems:'center',borderBottom:'1px solid var(--border)',transition:'background 0.1s'}}
                    onMouseEnter={ev=>ev.currentTarget.style.background='var(--surface2)'}
                    onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                    <span style={{fontSize:12,color:'var(--muted)'}}>{e.date}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="avatar xs">{e.taker_avatar||e.taker_name?.slice(0,2)}</div>
                      <span style={{fontSize:13}}>{e.taker_name}</span>
                    </div>
                    <span style={{fontSize:13}}>{e.is_pool ? '🫙 Pot commun' : e.owner_name || '—'}</span>
                    <span style={{fontSize:15,fontWeight:700,color:'var(--orange)',fontFamily:"'Fraunces',serif"}}>{e.hours}h</span>
                    <span style={{fontSize:12,color:'var(--muted)'}}>{e.description||'—'}</span>
                    <div style={{display:'flex',justifyContent:'flex-end',gap:6}}>
                      <button className="btn btn-ghost" style={{fontSize:11,padding:'3px 8px'}} onClick={() => {
                        setAdminForm({ hours: e.hours, date: e.date, description: e.description || '' });
                        setShowAdminEdit(e);
                      }}>✏️</button>
                      <button className="btn btn-danger" style={{fontSize:11,padding:'3px 8px'}} onClick={async () => {
                        if (!window.confirm('Supprimer cette entrée ?')) return;
                        await deleteDelegationEntry(e.id);
                        setAllEntries(prev => prev.filter(x => x.id !== e.id));
                        notify('🗑 Entrée supprimée');
                        load();
                      }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL : Saisir des heures (pour soi-même) ── */}
      {showEntry && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Saisir mes heures de délégation</div>

            {/* Info utilisateur connecté */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface2)', borderRadius:10, marginBottom:18 }}>
              <div className="avatar sm">{me?.avatar || me?.name?.slice(0,2).toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{me?.name}</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  {me?.titulaire ? (
                    <>Titulaire · Solde : <strong style={{ color:'var(--green)' }}>{getMemberBalance(me?.id)?.remaining ?? 20}h disponibles</strong></>
                  ) : (
                    <>Suppléant · Pot commun : <strong style={{ color:'var(--accent2)' }}>{summary?.pool?.remaining ?? 7}h disponibles</strong></>
                  )}
                </div>
              </div>
            </div>

            {/* Source — uniquement pour les titulaires qui peuvent choisir un autre compteur */}
            {me?.titulaire && (
              <div className="form-group">
                <label className="form-label">Compteur utilisé</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <button type="button"
                    onClick={() => setEntryForm(f => ({ ...f, source:'own', owner_id: String(me.id) }))}
                    style={{ padding:'10px 14px', border:`1px solid ${entryForm.source==='own'?'var(--accent)':'var(--border)'}`, borderRadius:8, background: entryForm.source==='own'?'rgba(79,124,255,0.12)':'transparent', color: entryForm.source==='own'?'var(--accent)':'var(--muted)', cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif", textAlign:'left', transition:'all 0.15s', display:'flex', justifyContent:'space-between' }}>
                    <span>📊 Mon propre compteur</span>
                    <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>{getMemberBalance(me?.id)?.remaining ?? 20}h dispo</span>
                  </button>
                  <button type="button"
                    onClick={() => setEntryForm(f => ({ ...f, source:'other', owner_id:'' }))}
                    style={{ padding:'10px 14px', border:`1px solid ${entryForm.source==='other'?'var(--accent)':'var(--border)'}`, borderRadius:8, background: entryForm.source==='other'?'rgba(79,124,255,0.12)':'transparent', color: entryForm.source==='other'?'var(--accent)':'var(--muted)', cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif", textAlign:'left', transition:'all 0.15s' }}>
                    🔄 Prendre sur le compteur d'un autre titulaire
                  </button>
                </div>
              </div>
            )}

            {/* Suppléant : pot commun + option mutualisation */}
            {!me?.titulaire && (
              <div className="form-group">
                <label className="form-label">Source des heures</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <button type="button"
                    onClick={() => setEntryForm(f => ({ ...f, source:'pool', owner_id:'' }))}
                    style={{ padding:'10px 14px', border:`1px solid ${entryForm.source==='pool'?'var(--accent2)':'var(--border)'}`, borderRadius:8, background: entryForm.source==='pool'?'rgba(124,92,252,0.08)':'transparent', color: entryForm.source==='pool'?'var(--accent2)':'var(--muted)', cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif", display:'flex', justifyContent:'space-between', transition:'all 0.15s' }}>
                    <span>🫙 Pot commun suppléants</span>
                    <span style={{ fontSize:12, color:'var(--accent2)', fontWeight:600 }}>{summary?.pool?.remaining ?? 7}h dispo</span>
                  </button>
                  <button type="button"
                    onClick={() => setEntryForm(f => ({ ...f, source:'other', owner_id:'' }))}
                    style={{ padding:'10px 14px', border:`1px solid ${entryForm.source==='other'?'var(--accent)':'var(--border)'}`, borderRadius:8, background: entryForm.source==='other'?'rgba(79,124,255,0.08)':'transparent', color: entryForm.source==='other'?'var(--accent)':'var(--muted)', cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
                    🔄 Demande d'heures depuis un titulaire
                  </button>
                  {entryForm.source === 'other' && (
                    <div style={{ padding:'10px 14px', background:'rgba(245,166,35,0.06)', border:'1px solid rgba(245,166,35,0.2)', borderRadius:8, fontSize:12, color:'var(--orange)' }}>
                      ⚠️ Une demande d'heures sera envoyée au titulaire. Les heures ne seront décomptées qu'après sa validation.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sélection du titulaire donneur */}
            {entryForm.source === 'other' && (
              <div className="form-group">
                <label className="form-label">{me?.titulaire ? 'Titulaire à débiter' : 'Titulaire donneur'} *</label>
                <select className="form-select" value={entryForm.owner_id}
                  onChange={e => setEntryForm(f => ({ ...f, owner_id: e.target.value }))}>
                  <option value="">— Choisir —</option>
                  {titulaires.filter(u => u.id !== me?.id).map(u => {
                    const bal = getMemberBalance(u.id);
                    return <option key={u.id} value={u.id}>{u.name} ({bal ? `${bal.remaining}h dispo` : '—'})</option>;
                  })}
                </select>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Heures *</label>
                <input className="form-input" type="number" step="0.5" min="0.5"
                  value={entryForm.hours} onChange={e => setEntryForm(f => ({ ...f, hours: e.target.value }))}
                  placeholder="Ex: 2.5" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={entryForm.date}
                  onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Motif</label>
              <input className="form-input" value={entryForm.description}
                onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Réunion NAO, visite inspection…" />
            </div>

            <div style={{ padding:'10px 14px', background:'rgba(79,124,255,0.06)', border:'1px solid rgba(79,124,255,0.2)', borderRadius:8, fontSize:12, color:'var(--muted)', marginBottom:4 }}>
              📧 Un email sera automatiquement envoyé à la RH et une copie sur la boîte CSE.
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowEntry(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveEntry}
                disabled={saving || !entryForm.hours || (entryForm.source === 'other' && !entryForm.owner_id)}>
                {saving ? 'Enregistrement…' : entryForm.source === 'other' && !me?.titulaire ? 'Envoyer la demande' : 'Saisir'}
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ── MODAL : Mutualisation ── */}
      {showTransfer && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:460 }}>
            <div className="modal-title">Demande d'heures</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:18, lineHeight:1.6 }}>
              Un membre peut demander à un titulaire de lui transférer des heures. Le titulaire devra valider.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Titulaire donneur *</label>
                <select className="form-select" value={transferForm.from_id} onChange={e => setTransferForm(f => ({ ...f, from_id: e.target.value }))}>
                  <option value="">— Choisir —</option>
                  {titulaires.map(u => {
                    const bal = getMemberBalance(u.id);
                    return <option key={u.id} value={u.id}>{u.name} ({bal ? `${bal.remaining}h dispo` : '—'})</option>;
                  })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bénéficiaire *</label>
                <select className="form-select" value={transferForm.to_id} onChange={e => setTransferForm(f => ({ ...f, to_id: e.target.value }))}>
                  <option value="">— Choisir —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.titulaire ? 'Titulaire' : 'Suppléant'})</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Heures *</label>
                <input className="form-input" type="number" step="0.5" min="0.5"
                  value={transferForm.hours} onChange={e => setTransferForm(f => ({ ...f, hours: e.target.value }))} placeholder="Ex: 3" />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={transferForm.date}
                  onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Motif</label>
              <input className="form-input" value={transferForm.note}
                onChange={e => setTransferForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Raison de la demande…" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowTransfer(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveTransfer}
                disabled={saving || !transferForm.from_id || !transferForm.to_id || !transferForm.hours}>
                {saving ? '…' : 'Envoyer la demande'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Config ── */}
      {showConfig && me?.is_admin && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚙️ Configuration délégation</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              {[['Heures/mois titulaires','hours_titulaire'],['Heures/mois pot suppléants','hours_suppleant'],['Plafond report (max)','max_report']].map(([label,key]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" type="number" step="1"
                    value={configForm[key]} onChange={e => setConfigForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))} />
                </div>
              ))}
            </div>

            {/* Premier mois de référence */}
            <div style={{ background:'rgba(79,124,255,0.06)', border:'1px solid rgba(79,124,255,0.2)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>📅 Mois de départ du système</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:12, lineHeight:1.5 }}>
                Définit le premier mois où les compteurs démarrent à 20h sans report. Avant cette date = ignoré.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Mois de départ</label>
                  <select className="form-select" value={configForm.start_month}
                    onChange={e => setConfigForm(f => ({ ...f, start_month: parseInt(e.target.value) }))}>
                    {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m,i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Année</label>
                  <input className="form-input" type="number" value={configForm.start_year}
                    onChange={e => setConfigForm(f => ({ ...f, start_year: parseInt(e.target.value) }))} />
                </div>
              </div>
            </div>
            <div className="divider" />
            <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>📧 Email RH</div>
            <div className="form-group">
              <label className="form-label">Email RH destinataire</label>
              <input className="form-input" type="email" value={configForm.rh_email}
                onChange={e => setConfigForm(f => ({ ...f, rh_email: e.target.value }))} placeholder="rh@entreprise.fr" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Serveur SMTP</label>
                <input className="form-input" value={configForm.smtp_host}
                  onChange={e => setConfigForm(f => ({ ...f, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Port</label>
                <input className="form-input" type="number" value={configForm.smtp_port}
                  onChange={e => setConfigForm(f => ({ ...f, smtp_port: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Email expéditeur</label>
                <input className="form-input" value={configForm.smtp_user}
                  onChange={e => setConfigForm(f => ({ ...f, smtp_user: e.target.value }))} placeholder="cse@entreprise.fr" />
              </div>
              <div className="form-group">
                <label className="form-label">Mot de passe SMTP</label>
                <input className="form-input" type="password" value={configForm.smtp_pass}
                  onChange={e => setConfigForm(f => ({ ...f, smtp_pass: e.target.value }))} placeholder="Laisser vide = inchangé" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowConfig(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>{saving ? '…' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Admin — modifier/forcer une saisie ── */}
      {showAdminEdit && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:460}}>
            <div className="modal-title">
              {showAdminEdit === 'new' ? '🛠 Forcer une saisie' : '✏️ Modifier la saisie'}
            </div>

            {showAdminEdit === 'new' && (
              <>
                <div className="form-group">
                  <label className="form-label">Bénéficiaire *</label>
                  <select className="form-select" value={adminForm.taker_id||''} onChange={e => setAdminForm(f=>({...f,taker_id:e.target.value}))}>
                    <option value="">— Choisir —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.titulaire?'Titulaire':'Suppléant'})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Compteur prélevé</label>
                  <select className="form-select" value={adminForm.owner_id||''} onChange={e => setAdminForm(f=>({...f,owner_id:e.target.value,is_pool:e.target.value==='pool'}))}>
                    <option value="">— Son propre compteur —</option>
                    {titulaires.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    <option value="pool">🫙 Pot commun suppléants</option>
                  </select>
                </div>
              </>
            )}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group">
                <label className="form-label">Heures *</label>
                <input className="form-input" type="number" step="0.5" value={adminForm.hours}
                  onChange={e => setAdminForm(f=>({...f,hours:e.target.value}))} placeholder="Ex: 2.5" />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={adminForm.date}
                  onChange={e => setAdminForm(f=>({...f,date:e.target.value}))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Motif / Note</label>
              <input className="form-input" value={adminForm.description}
                onChange={e => setAdminForm(f=>({...f,description:e.target.value}))}
                placeholder="Ex: Correction saisie du 10/04..." />
            </div>

            <div style={{padding:'10px 14px',background:'rgba(245,166,35,0.06)',border:'1px solid rgba(245,166,35,0.2)',borderRadius:8,fontSize:12,color:'var(--orange)',marginBottom:4}}>
              ⚠️ Mode admin — aucune vérification de solde. Les modifications sont tracées.
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAdminEdit(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving} onClick={async () => {
                setSaving(true);
                try {
                  if (showAdminEdit === 'new') {
                    await adminCreateEntry({
                      taker_id:    parseInt(adminForm.taker_id),
                      owner_id:    adminForm.is_pool ? null : (adminForm.owner_id ? parseInt(adminForm.owner_id) : parseInt(adminForm.taker_id)),
                      is_pool:     adminForm.is_pool || adminForm.owner_id === 'pool',
                      hours:       parseFloat(adminForm.hours),
                      date:        adminForm.date,
                      description: adminForm.description || '[Correction admin]',
                    });
                    notify('✅ Saisie forcée enregistrée');
                  } else {
                    await updateDelegationEntry(showAdminEdit.id, {
                      hours:       parseFloat(adminForm.hours),
                      date:        adminForm.date,
                      description: adminForm.description,
                    });
                    notify('✅ Saisie modifiée');
                  }
                  setShowAdminEdit(null);
                  load();
                } catch(e) {
                  notify('❌ ' + (e.response?.data?.error || 'Erreur'));
                } finally { setSaving(false); }
              }}>
                {saving ? '…' : showAdminEdit === 'new' ? 'Forcer la saisie' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Ajustement manuel du compteur ── */}
      {showAdjust && me?.is_admin && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:420 }}>
            <div className="modal-title">✏️ Ajuster le compteur</div>

            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface2)', borderRadius:10, marginBottom:18 }}>
              <div className="avatar sm">{showAdjust.avatar || showAdjust.name?.slice(0,2).toUpperCase()}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{showAdjust.name}</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  Solde actuel : <strong style={{ color:'var(--accent)' }}>
                    {getMemberBalance(showAdjust.id)?.remaining ?? '—'}h
                  </strong> / {getMemberBalance(showAdjust.id)?.total ?? 20}h
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nouveau solde souhaité (en heures) *</label>
              <input className="form-input" type="number" step="0.5" min="0"
                value={adjustTarget} onChange={e => setAdjustTarget(e.target.value)}
                placeholder="Ex: 20" autoFocus />
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>
                {adjustTarget && getMemberBalance(showAdjust.id) ? (
                  <span style={{ color: parseFloat(adjustTarget) > (getMemberBalance(showAdjust.id)?.remaining ?? 0) ? 'var(--green)' : 'var(--orange)' }}>
                    {parseFloat(adjustTarget) > (getMemberBalance(showAdjust.id)?.remaining ?? 0)
                      ? `↑ Augmentation de ${(parseFloat(adjustTarget) - (getMemberBalance(showAdjust.id)?.remaining ?? 0)).toFixed(1)}h`
                      : `↓ Réduction de ${((getMemberBalance(showAdjust.id)?.remaining ?? 0) - parseFloat(adjustTarget)).toFixed(1)}h`}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Motif de la correction</label>
              <input className="form-input" value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="Ex: Remise à zéro suite à erreur de saisie" />
            </div>

            <div style={{ padding:'10px 14px', background:'rgba(245,166,35,0.06)', border:'1px solid rgba(245,166,35,0.2)', borderRadius:8, fontSize:12, color:'var(--orange)', marginBottom:4 }}>
              ⚠️ L'ajustement sera tracé dans l'historique comme une correction admin.
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAdjust(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving || !adjustTarget}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const result = await adjustBalance({
                      user_id:      showAdjust.id,
                      target_hours: parseFloat(adjustTarget),
                      year,
                      month,
                      note:         adjustNote || `[Ajustement admin → ${adjustTarget}h]`,
                    });
                    setShowAdjust(null);
                    notify(`✅ Compteur de ${showAdjust.name} ajusté à ${result.new_remaining}h`);
                    load();
                  } catch(e) {
                    notify('❌ ' + (e.response?.data?.error || 'Erreur'));
                  } finally { setSaving(false); }
                }}>
                {saving ? '…' : 'Appliquer l\'ajustement'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
