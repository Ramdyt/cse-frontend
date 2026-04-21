// src/components/Notifications.jsx
import { useState, useEffect, useRef } from 'react';
import { getNotifications, markNotifRead, markAllNotifsRead } from '../api';
import api from '../api';

const TYPE_STYLES = {
  info:       { bg:'rgba(79,124,255,0.12)',  color:'var(--accent)',  icon:'ℹ️' },
  success:    { bg:'rgba(62,207,142,0.12)',  color:'var(--green)',   icon:'✅' },
  warning:    { bg:'rgba(245,166,35,0.12)',  color:'var(--orange)',  icon:'⚠️' },
  error:      { bg:'rgba(245,101,101,0.12)', color:'var(--red)',     icon:'❌' },
  delegation: { bg:'rgba(124,92,252,0.12)', color:'var(--accent2)', icon:'⏱' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h/24)}j`;
}

// ── Gestion Service Worker + Push ────────────────────────────────────────────
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch(e) {
    console.warn('SW registration failed:', e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function subscribePush(reg) {
  try {
    const { data } = await api.get('/push/vapid-key');
    if (!data.publicKey) return null;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
    await api.post('/push/subscribe', sub.toJSON());
    return sub;
  } catch(e) {
    console.warn('Push subscribe error:', e);
    return null;
  }
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function Notifications({ mobile = false }) {
  const { notifs, unreadCount, markRead, markAllRead } = useNotifs();
  const [open, setOpen]           = useState(false);
  const [pushState, setPushState] = useState('unknown');
  const panelRef = useRef(null);
  const swReg    = useRef(null);

  const unread = unreadCount;

  // Init SW push
  useEffect(() => {
    registerServiceWorker().then(reg => {
      if (!reg) { setPushState('unsupported'); return; }
      swReg.current = reg;
      const perm = Notification.permission;
      setPushState(perm);
      if (perm === 'granted') subscribePush(reg).catch(()=>{});
    });
  }, []);

  // Fermer en cliquant dehors
  useEffect(() => {
    const h = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleRead = async (n) => {
    if (!n.read) await markRead(n.id);
  };

  const handleReadAll = async () => {
    await markAllRead();
  };

  // Demander la permission push
  const enablePush = async () => {
    if (!swReg.current) {
      alert("Votre navigateur ne supporte pas les notifications push.");
      return;
    }
    const permission = await Notification.requestPermission();
    setPushState(permission);
    if (permission === 'granted') {
      const sub = await subscribePush(swReg.current);
      if (sub) {
        // Test
        await api.post('/push/test').catch(()=>{});
      }
    }
  };

  const disablePush = async () => {
    if (swReg.current) {
      const sub = await swReg.current.pushManager.getSubscription().catch(()=>null);
      if (sub) {
        await sub.unsubscribe().catch(()=>{});
        await api.delete('/push/subscribe', { data: { endpoint: sub.endpoint } }).catch(()=>{});
      }
    }
    setPushState('denied');
  };

  return (
    <div ref={panelRef} style={{ position:'relative' }}>
      {/* Bouton cloche — mode mobile (icône seule) ou sidebar (texte) */}
      {mobile ? (
        <button onClick={() => setOpen(o => !o)}
          style={{ position:'relative', background:'none', border:'none', cursor:'pointer',
            color: unread>0?'var(--text)':'var(--muted)', display:'flex', flexDirection:'column',
            alignItems:'center', gap:2, padding:'4px', width:'100%' }}>
          <div style={{ position:'relative' }}>
            <span style={{ fontSize:22 }}>🔔</span>
            {unread > 0 && (
              <span style={{ position:'absolute', top:-4, right:-6, background:'var(--red)', color:'#fff',
                borderRadius:'50%', fontSize:9, fontWeight:700, width:16, height:16,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <span style={{ fontSize:10, color:'var(--muted)', fontFamily:"'DM Sans',sans-serif" }}>Notifs</span>
        </button>
      ) : (
        <button onClick={() => setOpen(o => !o)}
          style={{ position:'relative', width:'100%', display:'flex', alignItems:'center', gap:6,
            background: open?'var(--surface2)':'none',
            border:'1px solid var(--border)',
            borderRadius:8, padding:'5px 10px', cursor:'pointer',
            color: unread>0?'var(--text)':'var(--muted)', fontSize:12,
            fontFamily:"'DM Sans',sans-serif", lineHeight:1, transition:'all 0.15s' }}>
          <span style={{ fontSize:14 }}>🔔</span>
          <span>Notifications</span>
          {unread > 0 && (
            <span style={{ marginLeft:'auto', background:'var(--red)', color:'#fff', borderRadius:20,
              fontSize:9, fontWeight:700, padding:'1px 6px', lineHeight:'14px' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div style={{ position:'absolute', bottom: mobile ? '110%' : 'auto', top: mobile ? 'auto' : '110%', right: mobile ? '-60px' : 0, width:320, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, boxShadow:'0 8px 40px rgba(0,0,0,0.4)', zIndex:200, overflow:'hidden', animation:'slideUp 0.15s ease' }}>

          {/* Header */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:14, fontWeight:600 }}>
              Notifications
              {unread > 0 && <span style={{ fontSize:11, color:'var(--red)', marginLeft:6 }}>{unread} non lue(s)</span>}
            </div>
            {unread > 0 && (
              <button onClick={handleReadAll} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--accent)', fontFamily:"'DM Sans',sans-serif" }}>
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Bannière notifications push */}
          {pushState === 'default' && (
            <div style={{ padding:'14px 16px', background:'linear-gradient(135deg, rgba(79,124,255,0.12), rgba(124,92,252,0.08))', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:22 }}>📳</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>Activer les alertes</div>
                  <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.4 }}>
                    Recevez une notification sur votre téléphone même quand l'écran est verrouillé ou l'app fermée.
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width:'100%', fontSize:12 }} onClick={enablePush}>
                🔔 Activer les notifications push
              </button>
            </div>
          )}

          {pushState === 'granted' && (
            <div style={{ padding:'10px 16px', background:'rgba(62,207,142,0.06)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'var(--green)' }}>📳 Alertes push activées</span>
              <button onClick={disablePush} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--muted)', fontFamily:"'DM Sans',sans-serif" }}>Désactiver</button>
            </div>
          )}

          {pushState === 'denied' && (
            <div style={{ padding:'12px 16px', background:'rgba(245,101,101,0.06)', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:12, color:'var(--red)', marginBottom:4 }}>❌ Notifications bloquées</div>
              <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.4 }}>
                Pour les activer : Paramètres de votre navigateur → Notifications → Autoriser pour ce site.
              </div>
            </div>
          )}

          {/* Liste notifications */}
          <div style={{ maxHeight:360, overflowY:'auto' }}>
            {notifs.filter(n => !n.read).length === 0 ? (
              <div style={{ padding:30, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
                {loading ? 'Chargement…' : 'Toutes les notifications sont lues'}
              </div>
            ) : notifs.filter(n => !n.read).map(n => {
              const s = TYPE_STYLES[n.type] || TYPE_STYLES.info;
              return (
                <div key={n.id} onClick={() => handleRead(n)}
                  style={{ padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: n.read?'transparent':'rgba(79,124,255,0.04)', display:'flex', gap:10, alignItems:'flex-start', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background=n.read?'transparent':'rgba(79,124,255,0.04)'}>
                  <div style={{ width:32, height:32, borderRadius:8, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                    {s.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:n.read?400:600 }}>{n.title}</span>
                      {!n.read && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />}
                    </div>
                    {n.body && <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.4, marginBottom:4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{n.body}</div>}
                    <div style={{ fontSize:11, color:'var(--border)' }}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {notifs.filter(n => !n.read).length > 0 && (
            <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', textAlign:'center' }}>
              <button onClick={handleReadAll} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--accent)', fontFamily:"'DM Sans',sans-serif" }}>
                ✅ Tout marquer comme lu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
