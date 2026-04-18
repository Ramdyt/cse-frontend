// src/pages/Meetings.jsx
import { useState, useEffect } from 'react';
import { getMeetings, createMeeting, deleteMeeting, setAttendance, getUsers } from '../api';
import { useAuth } from '../context';

function Avatar({ user, size = '' }) {
  return <div className={`avatar ${size}`} title={user?.name}>{user?.avatar || user?.name?.slice(0,2).toUpperCase()}</div>;
}

const TITULAIRE_OPTIONS = [
  { value: 'confirmed', label: '✅ Présent',     color: 'var(--green)'  },
  { value: 'declined',  label: '❌ Absent',      color: 'var(--red)'    },
  { value: 'pending',   label: '❓ À confirmer', color: 'var(--orange)' },
];
const SUPPLEANT_OPTIONS = [
  { value: 'confirmed', label: '✅ Disponible',  color: 'var(--green)'  },
  { value: 'declined',  label: '❌ Absent',      color: 'var(--red)'    },
  { value: 'pending',   label: '❓ À confirmer', color: 'var(--orange)' },
];

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function attendanceSummary(attendees) {
  const total     = attendees?.length || 0;
  const confirmed = attendees?.filter(a => a.attendance === 'confirmed').length || 0;
  const declined  = attendees?.filter(a => a.attendance === 'declined').length  || 0;
  return { total, confirmed, declined, pending: total - confirmed - declined };
}

export default function Meetings() {
  const { user: me } = useAuth();

  const [meetings, setMeetings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [attSaving, setAttSaving]   = useState({});
  const [form, setForm] = useState({ title:'', date:'', time:'14:00', location:'', agenda:'' });

  // Modal absent → remplaçant
  const [showReplace, setShowReplace]         = useState(null); // id réunion concernée
  const [replaceTarget, setReplaceTarget]     = useState('');

  const load = () => getMeetings()
    .then(m => setMeetings(m.sort((a,b) => a.date.localeCompare(b.date))))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // ── Helpers présence ─────────────────────────────────────────────────────
  const meAttendee    = (m) => m.attendees?.find(a => a.id === me?.id);
  const myAttendance  = (m) => meAttendee(m)?.attendance || 'pending';
  const myReplacement = (m) => { const r = meAttendee(m)?.replacement_id; return r ? parseInt(r) : null; };
  const isTitulaire   = !!me?.titulaire;
  const myOptions     = isTitulaire ? TITULAIRE_OPTIONS : SUPPLEANT_OPTIONS;
  const suppleants    = (m) => (m.attendees||[]).filter(u => !u.titulaire && u.id !== me?.id);

  // ── Présence ─────────────────────────────────────────────────────────────
  const attend = async (meetingId, status) => {
    if (isTitulaire && status === 'declined') {
      setShowReplace(meetingId); setReplaceTarget(''); return;
    }
    setAttSaving(s => ({...s, [meetingId]: true}));
    try { await setAttendance(meetingId, status, null); await load(); }
    finally { setAttSaving(s => ({...s, [meetingId]: false})); }
  };

  const confirmAbsent = async () => {
    if (!showReplace) return;
    setAttSaving(s => ({...s, [showReplace]: true}));
    try {
      await setAttendance(showReplace, 'declined', replaceTarget ? parseInt(replaceTarget) : null);
      setShowReplace(null); await load();
    } finally { setAttSaving(s => ({...s, [showReplace]: false})); }
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.title.trim() || !form.date || !form.time) return;
    setSaving(true);
    try {
      const data = { ...form, agenda: form.agenda.split('\n').filter(Boolean) };
      await createMeeting(data);
      setShowModal(false);
      setForm({ title:'', date:'', time:'14:00', location:'', agenda:'' });
      await load();
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!showDelete) return;
    await deleteMeeting(showDelete.id);
    setShowDelete(null);
    await load();
  };

  // ── Séparation à venir / passées ─────────────────────────────────────────
  const today      = new Date().toISOString().split('T')[0];
  const upcoming   = meetings.filter(m => m.date >= today);
  const past       = meetings.filter(m => m.date < today).reverse(); // plus récente en premier

  if (loading) return <div style={{ textAlign:'center', padding:60, color:'var(--muted)' }}>Chargement…</div>;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── Barre du haut ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:13, color:'var(--muted)' }}>
          {upcoming.length} réunion(s) à venir · {past.length} passée(s)
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouvelle réunion</button>
      </div>

      {/* ── À venir ── */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom:32 }}>
          <div className="section-title">📅 À venir</div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {upcoming.map(m => <MeetingCard key={m.id} m={m} me={me}
              myAttendance={myAttendance} myReplacement={myReplacement}
              myOptions={myOptions} isTitulaire={isTitulaire}
              attend={attend} attSaving={attSaving}
              suppleants={suppleants}
              showReplace={showReplace} replaceTarget={replaceTarget}
              setReplaceTarget={setReplaceTarget} confirmAbsent={confirmAbsent}
              onDelete={() => setShowDelete(m)} />
            )}
          </div>
        </div>
      )}

      {upcoming.length === 0 && (
        <div className="empty-state" style={{ marginBottom:32 }}>
          <div className="icon">📅</div>
          <div>Aucune réunion à venir</div>
        </div>
      )}

      {/* ── Passées ── */}
      {past.length > 0 && (
        <div>
          <div className="section-title" style={{ color:'var(--muted)' }}>🕐 Passées</div>
          <div style={{ display:'flex', flexDirection:'column', gap:16, opacity:0.75 }}>
            {past.map(m => <MeetingCard key={m.id} m={m} me={me}
              myAttendance={myAttendance} myReplacement={myReplacement}
              myOptions={myOptions} isTitulaire={isTitulaire}
              attend={attend} attSaving={attSaving}
              suppleants={suppleants}
              showReplace={showReplace} replaceTarget={replaceTarget}
              setReplaceTarget={setReplaceTarget} confirmAbsent={confirmAbsent}
              onDelete={() => setShowDelete(m)} isPast />
            )}
          </div>
        </div>
      )}

      {/* ── MODAL : Nouvelle réunion ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Nouvelle réunion</div>
            <div className="form-group">
              <label className="form-label">Titre *</label>
              <input className="form-input" autoFocus value={form.title}
                onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ex: Réunion mensuelle CSE" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={form.date}
                  onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Heure *</label>
                <input className="form-input" type="time" value={form.time}
                  onChange={e=>setForm(f=>({...f,time:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Lieu</label>
                <input className="form-input" value={form.location}
                  onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Salle, Teams…" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ordre du jour (une ligne par point)</label>
              <textarea className="form-textarea" rows={4} value={form.agenda}
                onChange={e=>setForm(f=>({...f,agenda:e.target.value}))}
                placeholder={"Bilan du mois\nQuestions diverses\n…"} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Confirmer suppression ── */}
      {showDelete && (
        <div className="modal-overlay" onClick={()=>setShowDelete(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:420 }}>
            <div className="modal-title">Supprimer la réunion</div>
            <div style={{ fontSize:14, color:'var(--muted)', marginBottom:20, lineHeight:1.6 }}>
              Voulez-vous supprimer <strong style={{ color:'var(--text)' }}>"{showDelete.title}"</strong>
              {' '}du {fmtDate(showDelete.date)} ?<br/>
              <span style={{ fontSize:13, color:'var(--red)' }}>⚠️ Cette action est irréversible.</span>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowDelete(null)}>Annuler</button>
              <button onClick={confirmDelete}
                style={{ background:'var(--red)', color:'#fff', border:'none', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : Titulaire absent → remplaçant ── */}
      {showReplace && (() => {
        const meeting = meetings.find(m => m.id === showReplace);
        if (!meeting) return null;
        const sups = suppleants(meeting);
        return (
          <div className="modal-overlay">
            <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:440 }}>
              <div className="modal-title">❌ Déclarer une absence</div>
              <div style={{ fontSize:13, color:'var(--muted)', marginBottom:18, lineHeight:1.6 }}>
                Vous serez marqué <strong style={{ color:'var(--red)' }}>Absent</strong> pour
                <strong style={{ color:'var(--text)' }}> "{meeting.title}"</strong> du {fmtDate(meeting.date)}.
              </div>
              <div className="form-group">
                <label className="form-label">Suppléant remplaçant (optionnel)</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                  {/* Aucun */}
                  <div onClick={()=>setReplaceTarget('')}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8,
                      border:`1px solid ${replaceTarget===''?'var(--accent)':'var(--border)'}`,
                      background:replaceTarget===''?'rgba(79,124,255,0.08)':'transparent', cursor:'pointer' }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${replaceTarget===''?'var(--accent)':'var(--border)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {replaceTarget==='' && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)' }} />}
                    </div>
                    <span style={{ fontSize:13, color:'var(--muted)' }}>Aucun remplaçant désigné</span>
                  </div>
                  {/* Suppléants */}
                  {sups.map(u => {
                    const opt = SUPPLEANT_OPTIONS.find(o=>o.value===u.attendance) || SUPPLEANT_OPTIONS[2];
                    const sel = replaceTarget === String(u.id);
                    return (
                      <div key={u.id} onClick={()=>setReplaceTarget(String(u.id))}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8,
                          border:`1px solid ${sel?'var(--accent)':'var(--border)'}`,
                          background:sel?'rgba(79,124,255,0.08)':'transparent', cursor:'pointer' }}>
                        <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${sel?'var(--accent)':'var(--border)'}`,
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {sel && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)' }} />}
                        </div>
                        <Avatar user={u} size="xs" />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:sel?500:400 }}>{u.name}</div>
                          <div style={{ fontSize:11, color:'var(--muted)' }}>{u.role}</div>
                        </div>
                        <span style={{ fontSize:11, color:opt.color, background:`${opt.color}22`, padding:'2px 8px', borderRadius:10 }}>
                          {opt.label}
                        </span>
                      </div>
                    );
                  })}
                  {sups.length === 0 && (
                    <div style={{ fontSize:12, color:'var(--muted)', padding:'8px 0' }}>Aucun suppléant dans cette réunion.</div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={()=>setShowReplace(null)}>Annuler</button>
                <button className="btn btn-danger" onClick={confirmAbsent} disabled={attSaving[showReplace]}>
                  {attSaving[showReplace] ? '…' : 'Confirmer l\'absence'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Composant carte réunion ────────────────────────────────────────────────────
function MeetingCard({ m, me, myAttendance, myReplacement, myOptions, isTitulaire,
  attend, attSaving, suppleants, onDelete, isPast }) {

  const [open, setOpen] = useState(false); // toutes repliées par défaut

  const att  = myAttendance(m);
  const summ = attendanceSummary(m.attendees);

  return (
    <div className="card" style={{ borderLeft:`3px solid ${isPast ? 'var(--border)' : 'var(--accent)'}`, padding:0, overflow:'hidden' }}>

      {/* ── En-tête cliquable ── */}
      <div onClick={() => setOpen(o=>!o)}
        style={{ padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:14,
          background: open ? 'transparent' : 'var(--surface2)', transition:'background 0.15s' }}>

        {/* Date en bloc */}
        <div style={{ textAlign:'center', minWidth:42, flexShrink:0 }}>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:"'Fraunces',serif",
            color: isPast ? 'var(--muted)' : 'var(--accent)', lineHeight:1 }}>
            {m.date.split('-')[2]}
          </div>
          <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>
            {['jan','fév','mar','avr','mai','juin','juil','aoû','sep','oct','nov','déc'][parseInt(m.date.split('-')[1])-1]}
          </div>
          <div style={{ fontSize:10, color:'var(--border)' }}>{m.date.split('-')[0]}</div>
        </div>

        <div style={{ width:1, height:40, background:'var(--border)', flexShrink:0 }} />

        {/* Titre + méta */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:3 }}>{m.title}</div>
          <div style={{ fontSize:12, color:'var(--muted)', display:'flex', gap:10, flexWrap:'wrap' }}>
            <span>🕐 {m.time}</span>
            {m.location && <span>📍 {m.location}</span>}
          </div>
        </div>

        {/* Mon statut + compteurs + chevron */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          {/* Mon statut */}
          {(() => {
            const opt = myOptions.find(o=>o.value===att) || myOptions[2];
            return (
              <span style={{ fontSize:11, color:opt.color, background:`${opt.color}22`,
                padding:'3px 10px', borderRadius:20, fontWeight:500, whiteSpace:'nowrap' }}>
                {opt.label}
              </span>
            );
          })()}
          {/* Compteurs globaux */}
          <div style={{ fontSize:11, color:'var(--muted)', display:'flex', gap:6 }}>
            {summ.confirmed>0 && <span style={{ color:'var(--green)' }}>✅{summ.confirmed}</span>}
            {summ.declined>0  && <span style={{ color:'var(--red)' }}>❌{summ.declined}</span>}
            {summ.pending>0   && <span style={{ color:'var(--orange)' }}>❓{summ.pending}</span>}
          </div>
          <span style={{ color:'var(--muted)', fontSize:16, transition:'transform 0.2s', display:'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
        </div>
      </div>

      {/* ── Contenu déplié ── */}
      {open && (
        <div style={{ padding:'0 20px 20px', borderTop:'1px solid var(--border)' }}>

          {/* Barre de présences */}
          {summ.total > 0 && (
            <div style={{ marginTop:14, marginBottom:16 }}>
              <div style={{ height:5, borderRadius:4, background:'var(--surface2)', overflow:'hidden', display:'flex' }}>
                <div style={{ width:`${summ.confirmed/summ.total*100}%`, background:'var(--green)' }} />
                <div style={{ width:`${summ.declined/summ.total*100}%`,  background:'var(--red)' }} />
                <div style={{ width:`${summ.pending/summ.total*100}%`,   background:'var(--orange)' }} />
              </div>
              <div style={{ display:'flex', gap:14, marginTop:5, fontSize:11, color:'var(--muted)' }}>
                <span style={{ color:'var(--green)' }}>✅ {summ.confirmed} présent(s)</span>
                <span style={{ color:'var(--red)' }}>❌ {summ.declined} absent(s)</span>
                <span style={{ color:'var(--orange)' }}>❓ {summ.pending} à confirmer</span>
              </div>
            </div>
          )}

          {/* Boutons ma présence */}
          {!isPast && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, textTransform:'uppercase',
                letterSpacing:'0.05em', fontWeight:500 }}>
                Ma présence {!isTitulaire && <span style={{ color:'var(--accent2)' }}>· Suppléant</span>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {myOptions.map(opt => {
                  const isActive = att === opt.value;
                  return (
                    <button key={opt.value}
                      onClick={() => !attSaving[m.id] && attend(m.id, opt.value)}
                      disabled={attSaving[m.id]}
                      style={{ flex:1, padding:'8px 4px', border:`2px solid ${isActive?opt.color:'var(--border)'}`,
                        borderRadius:8, background:isActive?`${opt.color}22`:'transparent',
                        color:isActive?opt.color:'var(--muted)', fontSize:11, cursor:'pointer',
                        fontFamily:"'DM Sans',sans-serif", fontWeight:isActive?600:400,
                        transition:'all 0.15s', textAlign:'center', opacity:attSaving[m.id]?0.5:1 }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {/* Remplaçant désigné */}
              {isTitulaire && att === 'declined' && myReplacement(m) && (() => {
                const rep = (m.attendees||[]).find(u => parseInt(u.id) === myReplacement(m));
                return rep ? (
                  <div style={{ marginTop:8, fontSize:12, color:'var(--muted)', display:'flex', alignItems:'center', gap:6 }}>
                    <span>↳ Remplacé par</span>
                    <Avatar user={rep} size="xs" />
                    <span style={{ color:'var(--text)' }}>{rep.name}</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Ordre du jour */}
          {m.agenda?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', textTransform:'uppercase',
                letterSpacing:'0.05em', marginBottom:8 }}>Ordre du jour</div>
              <ul className="agenda-list">
                {m.agenda.map((a,i) => (
                  <li className="agenda-item" key={i}>
                    <span className="agenda-num">{i+1}</span>
                    <span style={{ fontSize:13 }}>{a.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Participants — séparés titulaires / suppléants */}
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--muted)', textTransform:'uppercase',
              letterSpacing:'0.05em', marginBottom:10 }}>
              Participants ({m.attendees?.length||0})
            </div>

            {/* ── Titulaires ── */}
            {(m.attendees||[]).filter(u=>u.titulaire).length > 0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, color:'var(--accent)', textTransform:'uppercase',
                  letterSpacing:'0.06em', fontWeight:600, marginBottom:6,
                  display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)' }} />
                  Titulaires
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {(m.attendees||[]).filter(u=>u.titulaire).map(u => {
                    const opt = TITULAIRE_OPTIONS.find(o=>o.value===u.attendance) || TITULAIRE_OPTIONS[2];
                    const rep = u.replacement_id
                      ? (m.attendees||[]).find(a=>parseInt(a.id)===parseInt(u.replacement_id))
                      : null;
                    return (
                      <div key={u.id} style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 12px',
                        borderLeft:`2px solid ${opt.color}` }}>
                        {/* Ligne principale */}
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar user={u} size="xs" />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:500 }}>{u.name}</div>
                            <div style={{ fontSize:10, color:'var(--muted)' }}>{u.role}</div>
                          </div>
                          <span style={{ fontSize:11, color:opt.color, fontWeight:600,
                            background:`${opt.color}18`, padding:'2px 8px', borderRadius:10, flexShrink:0 }}>
                            {opt.label}
                          </span>
                        </div>
                        {/* Remplaçant */}
                        {rep && (
                          <div style={{ marginTop:6, paddingTop:6, borderTop:'1px solid var(--border)',
                            fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:5 }}>
                            <span>↳ Remplacé(e) par</span>
                            <Avatar user={rep} size="xs" />
                            <span style={{ color:'var(--accent)', fontWeight:500 }}>{rep.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Suppléants ── */}
            {(m.attendees||[]).filter(u=>!u.titulaire).length > 0 && (
              <div>
                <div style={{ fontSize:10, color:'var(--accent2)', textTransform:'uppercase',
                  letterSpacing:'0.06em', fontWeight:600, marginBottom:6,
                  display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent2)' }} />
                  Suppléants
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {(m.attendees||[]).filter(u=>!u.titulaire).map(u => {
                    const opt = SUPPLEANT_OPTIONS.find(o=>o.value===u.attendance) || SUPPLEANT_OPTIONS[2];
                    // Trouver le titulaire que ce suppléant remplace
                    const replacedTitulaire = (m.attendees||[]).find(
                      a => a.titulaire && parseInt(a.replacement_id) === parseInt(u.id) && a.attendance === 'declined'
                    );
                    return (
                      <div key={u.id} style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 12px',
                        borderLeft:`2px solid ${replacedTitulaire ? 'var(--accent)' : opt.color}` }}>
                        {/* Ligne principale */}
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar user={u} size="xs" />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>
                              {u.name}
                              {replacedTitulaire && (
                                <span style={{ fontSize:9, color:'var(--accent)',
                                  background:'rgba(79,124,255,0.12)', padding:'1px 6px', borderRadius:8, fontWeight:600 }}>
                                  remplaçant
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize:10, color:'var(--muted)' }}>{u.role}</div>
                          </div>
                          <span style={{ fontSize:11, color:opt.color, fontWeight:600,
                            background:`${opt.color}18`, padding:'2px 8px', borderRadius:10, flexShrink:0 }}>
                            {opt.label}
                          </span>
                        </div>
                        {/* Titulaire remplacé */}
                        {replacedTitulaire && (
                          <div style={{ marginTop:6, paddingTop:6, borderTop:'1px solid var(--border)',
                            fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:5 }}>
                            <span>↳ Remplace</span>
                            <Avatar user={replacedTitulaire} size="xs" />
                            <span style={{ color:'var(--text)', fontWeight:500 }}>{replacedTitulaire.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bouton supprimer */}
          <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-danger" style={{ fontSize:11 }} onClick={onDelete}>🗑 Supprimer la réunion</button>
          </div>
        </div>
      )}
    </div>
  );
}
