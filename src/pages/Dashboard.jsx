// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { getMeetings, getNotes, getDocuments } from '../api';
import { useAuth } from '../context';

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [notes, setNotes]       = useState([]);
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getMeetings(), getNotes(), getDocuments()])
      .then(([m, n, d]) => { setMeetings(m); setNotes(n); setDocs(d); })
      .finally(() => setLoading(false));
  }, []);

  const upcoming   = meetings.filter(m => m.status === 'upcoming');
  const nextMeeting = upcoming.sort((a, b) => a.date.localeCompare(b.date))[0];

  if (loading) return <Loader />;

  return (
    <div>
      <div className="stats-grid">
        {[
          { icon: '📝', value: notes.length,    label: 'Notes & idées' },
          { icon: '📅', value: upcoming.length,  label: 'Réunions à venir' },
          { icon: '📁', value: docs.length,      label: 'Documents partagés' },
          { icon: '✅', value: notes.filter(n => n.status === 'validee').length, label: 'Notes validées' },
        ].map((s, i) => (
          <div className="stat-card" key={i} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="section-title">Prochaine réunion</div>
          {nextMeeting ? (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{nextMeeting.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>📅 {nextMeeting.date} à {nextMeeting.time}</span>
                {nextMeeting.location && <span>📍 {nextMeeting.location}</span>}
              </div>
              {nextMeeting.agenda?.length > 0 && (
                <>
                  <div className="section-title" style={{ fontSize: 13 }}>Ordre du jour</div>
                  <ul className="agenda-list">
                    {nextMeeting.agenda.map((a, i) => (
                      <li className="agenda-item" key={i}>
                        <span className="agenda-num">{i + 1}</span>
                        <span>{a.content}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button className="btn btn-ghost" style={{ marginTop: 14, fontSize: 12 }} onClick={() => onNavigate('meetings')}>
                Voir toutes les réunions →
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">📅</div>
              <div>Aucune réunion à venir</div>
              <button className="btn btn-primary" style={{ marginTop: 12, fontSize: 12 }} onClick={() => onNavigate('meetings')}>
                Planifier une réunion
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">Dernières notes</div>
          {notes.slice(0, 5).map(note => (
            <div key={note.id} className="activity-item">
              <span style={{ fontSize: 18 }}>
                {note.status === 'idee' ? '💡' : note.status === 'discussion' ? '💬' : '✅'}
              </span>
              <div>
                <div className="activity-text">{note.title}</div>
                <div className="activity-time">{note.author?.name} · {note.theme}</div>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="empty-state" style={{ padding: 20 }}>Aucune note pour l'instant</div>
          )}
          <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={() => onNavigate('notes')}>
            Voir toutes les notes →
          </button>
        </div>
      </div>

      {/* Documents récents */}
      {docs.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Documents récents</div>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onNavigate('docs')}>Voir tout →</button>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {docs.slice(0, 4).map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)',
                fontSize: 13, flex: '1 1 200px',
              }}>
                <span style={{ fontSize: 20 }}>{doc.icon}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12 }}>{doc.name.slice(0, 28)}{doc.name.length > 28 ? '…' : ''}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{doc.size}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Chargement…</div>
    </div>
  );
}
