// src/pages/Chat.jsx
import { useState, useEffect, useRef } from 'react';
import { getChannels, getMessages, createChannel, deleteChannel } from '../api';
import { useAuth, useSocket } from '../context';

function Avatar({ user, size = '' }) {
  return <div className={`avatar ${size}`} title={user?.name}>{user?.avatar || user?.name?.slice(0,2).toUpperCase()}</div>;
}

export default function Chat() {
  const { user: me }  = useAuth();
  const socket        = useSocket();
  const [channels, setChannels]       = useState([]);
  const [channel, setChannel]         = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [typing, setTyping]           = useState(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Mobile sidebar canaux
  const [showChannelsMobile, setShowChannelsMobile] = useState(false);

  // Modales
  const [showNewChannel, setShowNewChannel]       = useState(false);
  const [showDeleteChannel, setShowDeleteChannel] = useState(null); // canal à supprimer
  const [newChName, setNewChName] = useState('');
  const [newChDesc, setNewChDesc] = useState('');
  const [saving, setSaving]       = useState(false);

  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    getChannels().then(ch => { setChannels(ch); if (ch.length > 0) setChannel(ch[0]); });
  }, []);

  useEffect(() => {
    if (!channel) return;
    setLoadingMsgs(true);
    socket.joinChannel(channel.name);
    getMessages(channel.name).then(setMessages).finally(() => setLoadingMsgs(false));
  }, [channel]);

  useEffect(() => {
    return socket.onMessage(({ channelName, message }) => {
      if (channelName === channel?.name) setMessages(prev => [...prev, message]);
    });
  }, [channel]);

  useEffect(() => {
    return socket.onTyping(({ channelName, user, isTyping }) => {
      if (channelName === channel?.name && user.id !== me?.id)
        setTyping(isTyping ? user.name : null);
    });
  }, [channel, me]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || !channel) return;
    socket.sendMessage(channel.name, text);
    setInput('');
    socket.emitTyping(channel.name, false);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    socket.emitTyping(channel.name, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emitTyping(channel.name, false), 1500);
  };

  const addChannel = async () => {
    if (!newChName.trim()) return;
    setSaving(true);
    try {
      const ch = await createChannel(newChName, newChDesc);
      setChannels(prev => [...prev, ch]);
      setChannel(ch);
      setShowNewChannel(false);
      setNewChName(''); setNewChDesc('');
    } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!showDeleteChannel) return;
    setSaving(true);
    try {
      await deleteChannel(showDeleteChannel.id);
      const rest = channels.filter(c => c.id !== showDeleteChannel.id);
      setChannels(rest);
      setChannel(rest[0] || null);
      setShowDeleteChannel(null);
    } catch (e) { alert(e.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <div className="chat-layout">
      {/* Overlay mobile pour fermer la sidebar */}
      {showChannelsMobile && (
        <div onClick={() => setShowChannelsMobile(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:199 }} />
      )}

      {/* Sidebar canaux */}
      <div className={`chat-sidebar ${showChannelsMobile ? 'mobile-visible' : ''}`}>
        <div className="chat-sidebar-title">Canaux</div>
        {channels.map(ch => (
          <div key={ch.id}
            className={`channel-item ${channel?.id === ch.id ? 'active' : ''}`}
            style={{ justifyContent: 'space-between', paddingRight: 6 }}>
            <span onClick={() => setChannel(ch)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="channel-hash">#</span> {ch.name}
            </span>
            {ch.name !== 'general' && (
              <button
                onClick={e => { e.stopPropagation(); setShowDeleteChannel(ch); }}
                title={`Supprimer #${ch.name}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: '2px 4px', borderRadius: 4, lineHeight: 1, flexShrink: 0 }}
                onMouseEnter={e => { e.target.style.color = 'var(--red)'; e.target.style.background = 'rgba(245,101,101,0.1)'; }}
                onMouseLeave={e => { e.target.style.color = 'var(--muted)'; e.target.style.background = 'none'; }}>
                🗑
              </button>
            )}
          </div>
        ))}

        <button className="channel-item" style={{ color: 'var(--accent)', marginTop: 4, border: '1px dashed rgba(79,124,255,0.3)', borderRadius: 8, margin: '6px 4px 0' }}
          onClick={() => { setNewChName(''); setNewChDesc(''); setShowNewChannel(true); }}>
          + Nouveau canal
        </button>

        <div className="divider" />
        <div className="chat-sidebar-title">État</div>
        <div className="channel-item" style={{ cursor: 'default', gap: 6 }}>
          <span style={{ fontSize: 10, color: socket.connected ? 'var(--green)' : 'var(--red)' }}>●</span>
          {socket.connected ? 'En ligne' : 'Déconnecté'}
        </div>
      </div>

      {/* Zone messages */}
      <div className="chat-main">
        <div className="chat-header">
          {/* Bouton canaux — visible seulement sur mobile */}
          <button onClick={() => setShowChannelsMobile(o => !o)}
            className="mobile-only"
            style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8,
              padding:'6px 10px', cursor:'pointer', color:'var(--accent)', fontSize:12,
              fontFamily:"'DM Sans',sans-serif", display:'none', alignItems:'center', gap:5, flexShrink:0 }}>
            ☰ Canaux
          </button>
          <span style={{ color: 'var(--muted)', fontSize: 18 }}>#</span>
          <span style={{ fontWeight: 600 }}>{channel?.name || '…'}</span>
          {channel?.description && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>— {channel.description}</span>}
        </div>

        <div className="chat-messages">
          {loadingMsgs ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 13 }}>Chargement…</div>
          ) : messages.length === 0 ? (
            <div className="empty-state"><div className="icon">💬</div><div>Aucun message dans ce canal</div></div>
          ) : messages.map(msg => {
            const isMe = msg.user?.id === me?.id;
            return (
              <div key={msg.id} className={`message ${isMe ? 'me' : ''}`}>
                {!isMe && <Avatar user={msg.user} size="sm" />}
                <div>
                  {!isMe && <div className="msg-name">{msg.user?.name}</div>}
                  <div className="msg-bubble">{msg.text}</div>
                  <div className="msg-meta">{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            );
          })}
          {typing && <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', paddingLeft: 4 }}>{typing} est en train d'écrire…</div>}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-row">
            <input className="chat-input" placeholder={`Message dans #${channel?.name || '…'}`} value={input}
              onChange={handleInput} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
            <button className="send-btn" onClick={send} disabled={!input.trim()}>↑</button>
          </div>
        </div>
      </div>

      {/* Modal : Nouveau canal */}
      {showNewChannel && (
        <div className="modal-overlay" onClick={() => setShowNewChannel(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-title">Nouveau canal</div>
            <div className="form-group">
              <label className="form-label">Nom du canal *</label>
              <input className="form-input" value={newChName} autoFocus
                onChange={e => setNewChName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChannel()}
                placeholder="Ex: juridique, sécurité…" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Converti automatiquement en minuscules sans espaces.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optionnel)</label>
              <input className="form-input" value={newChDesc}
                onChange={e => setNewChDesc(e.target.value)}
                placeholder="Ex: Discussion juridique et réglementaire" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNewChannel(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={addChannel} disabled={saving || !newChName.trim()}>
                {saving ? '…' : 'Créer le canal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : Confirmer suppression canal */}
      {showDeleteChannel && (
        <div className="modal-overlay" onClick={() => setShowDeleteChannel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-title">Supprimer le canal</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Voulez-vous supprimer le canal <strong style={{ color: 'var(--text)' }}>#{showDeleteChannel.name}</strong> ?<br />
              <span style={{ color: 'var(--red)', fontSize: 13 }}>⚠️ Tous les messages seront définitivement perdus.</span>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDeleteChannel(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={saving}
                style={{ background: 'var(--red)', color: '#fff', border: 'none' }}>
                {saving ? '…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
