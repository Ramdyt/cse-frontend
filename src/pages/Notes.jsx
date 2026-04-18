// src/pages/Notes.jsx
import { useState, useEffect } from "react";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getThemes,
  createTheme,
  deleteTheme,
  getMeetings,
} from "../api";

const STATUSES = [
  { key: "proposition", label: "💡 Propositions", dot: "#4f7cff" },
  { key: "discussion", label: "💬 En discussion", dot: "#f5a623" },
  { key: "validee", label: "✅ Validées", dot: "#3ecf8e" },
  { key: "refusee", label: "❌ Refusées", dot: "#f56565" },
];
const COLORS = [
  "#4f7cff",
  "#3ecf8e",
  "#f5a623",
  "#f56565",
  "#7c5cfc",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [themes, setThemes] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [theme, setTheme] = useState("Tous");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    status: "proposition",
    theme: "",
    meeting_id: "",
  });
  const [saving, setSaving] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState({
    note: null,
    newStatus: "",
  });
  const [selectedMeeting, setSelectedMeeting] = useState("");

  // Colonnes réductibles
  const [collapsedCols, setCollapsedCols] = useState({});
  const toggleCol = (key) =>
    setCollapsedCols((prev) => ({ ...prev, [key]: !prev[key] }));

  // Modales thèmes
  const [showNewTheme, setShowNewTheme] = useState(false);
  const [showDeleteTheme, setShowDeleteTheme] = useState(null);
  const [showDeleteNote, setShowDeleteNote] = useState(null);
  const [themeForm, setThemeForm] = useState({ name: "", color: "#4f7cff" });

  useEffect(() => {
    Promise.all([getThemes(), getMeetings()]).then(([t, m]) => {
      setThemes(t);
      setMeetings(m);
      setForm((f) => ({ ...f, theme: f.theme || t[0]?.name || "" }));
    });
    loadNotes();
  }, []);

  useEffect(() => {
    if (!loading) loadNotes();
  }, [theme]);

  const loadNotes = () => {
    const params = theme !== "Tous" ? { theme } : {};
    return getNotes(params)
      .then(setNotes)
      .finally(() => setLoading(false));
  };

  const openNew = () => {
    const defaultTheme = theme !== "Tous" ? theme : themes[0]?.name || "";
    setEditNote(null);
    setForm({
      title: "",
      content: "",
      status: "proposition",
      theme: defaultTheme,
      meeting_id: "",
    });
    setShowModal(true);
  };

  const openEdit = (note) => {
    setEditNote(note);
    setForm({
      title: note.title,
      content: note.content,
      status: note.status,
      theme: note.theme,
      meeting_id: note.meeting_id || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, meeting_id: form.meeting_id || null };
      if (editNote) {
        const updated = await updateNote(editNote.id, payload);
        setNotes((prev) =>
          prev.map((n) => (n.id === editNote.id ? updated : n)),
        );
      } else {
        const created = await createNote(payload);
        setNotes((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  // remove ouvre le modal de confirmation
  const remove = (note) => {
    setShowDeleteNote(note);
  };

  const confirmDeleteNote = async () => {
    if (!showDeleteNote) return;
    await deleteNote(showDeleteNote.id);
    setNotes((prev) => prev.filter((n) => n.id !== showDeleteNote.id));
    setShowDeleteNote(null);
  };

  const requestStatusChange = (note, newStatus) => {
    if (note.status === "proposition" && newStatus !== "proposition") {
      setSelectedMeeting(note.meeting_id || "");
      setPendingStatus({ note, newStatus });
      setShowStatusModal(true);
    } else {
      applyStatus(note, newStatus, note.meeting_id);
    }
  };

  const applyStatus = async (note, newStatus, meetingId) => {
    const updated = await updateNote(note.id, {
      status: newStatus,
      meeting_id: meetingId || null,
    });
    setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    setShowStatusModal(false);
  };

  // Thèmes
  const saveTheme = async () => {
    if (!themeForm.name.trim()) return;
    setSaving(true);
    try {
      const t = await createTheme(themeForm.name, themeForm.color);
      setThemes((prev) =>
        [...prev, t].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setShowNewTheme(false);
      setThemeForm({ name: "", color: "#4f7cff" });
    } catch (e) {
      alert(e.response?.data?.error || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteTheme = async () => {
    if (!showDeleteTheme) return;
    try {
      await deleteTheme(showDeleteTheme.id);
      setThemes((prev) => prev.filter((t) => t.id !== showDeleteTheme.id));
      if (theme === showDeleteTheme.name) setTheme("Tous");
      setShowDeleteTheme(null);
    } catch (e) {
      alert(e.response?.data?.error || "Erreur");
      setShowDeleteTheme(null);
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
        Chargement…
      </div>
    );

  return (
    <div>
      <div className="notes-toolbar">
        <div className="theme-tabs">
          <button
            className={`theme-tab ${theme === "Tous" ? "active" : ""}`}
            onClick={() => setTheme("Tous")}
          >
            Tous
          </button>
          {themes.map((t) => (
            <div
              key={t.id}
              style={{ display: "flex", alignItems: "center", gap: 2 }}
            >
              <button
                className={`theme-tab ${theme === t.name ? "active" : ""}`}
                onClick={() => setTheme(t.name)}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: t.color,
                    marginRight: 5,
                  }}
                />
                {t.name}
              </button>
              <button
                onClick={() => setShowDeleteTheme(t)}
                title="Supprimer ce thème"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontSize: 13,
                  padding: "2px 4px",
                  borderRadius: 4,
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "var(--red)";
                  e.target.style.background = "rgba(245,101,101,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "var(--muted)";
                  e.target.style.background = "none";
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <button
            className="theme-tab"
            onClick={() => setShowNewTheme(true)}
            style={{
              color: "var(--accent)",
              borderColor: "rgba(79,124,255,0.3)",
            }}
          >
            + Thème
          </button>
        </div>
        <button className="btn btn-primary ml-auto" onClick={openNew}>
          + Nouvelle note
        </button>
      </div>

      {/* Grille kanban avec colonnes réductibles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: STATUSES.map((s) =>
            collapsedCols[s.key] ? "42px" : "1fr",
          ).join(" "),
          gap: 10,
          transition: "grid-template-columns 0.3s ease",
        }}
      >
        {STATUSES.map((s) => {
          const isCollapsed = !!collapsedCols[s.key];
          const colNotes = notes.filter((n) => n.status === s.key);
          return (
            <div key={s.key} style={{ minWidth: 0, overflow: "hidden" }}>
              {/* En-tête de colonne */}
              <div
                className="notes-col-header"
                style={{
                  cursor: "pointer",
                  userSelect: "none",
                  justifyContent: "space-between",
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: isCollapsed ? `${s.dot}22` : "transparent",
                  border: `1px solid ${isCollapsed ? s.dot + "44" : "transparent"}`,
                  transition: "all 0.2s",
                  marginBottom: 10,
                  gap: 6,
                }}
                onClick={() => toggleCol(s.key)}
              >
                {isCollapsed ? (
                  /* Vue réduite — vertical */
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                    }}
                  >
                    <div className="col-dot" style={{ background: s.dot }} />
                    <span
                      style={{ fontSize: 10, color: s.dot, fontWeight: 700 }}
                    >
                      {colNotes.length}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--muted)",
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        letterSpacing: "0.05em",
                        marginTop: 4,
                      }}
                    >
                      {s.label.split(" ").slice(1).join(" ")}
                    </span>
                    <span style={{ fontSize: 14, marginTop: 4 }}>›</span>
                  </div>
                ) : (
                  /* Vue normale */
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      <div className="col-dot" style={{ background: s.dot }} />
                      <span>{s.label}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          marginLeft: 2,
                        }}
                      >
                        {colNotes.length}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        flexShrink: 0,
                      }}
                    >
                      ‹
                    </span>
                  </>
                )}
              </div>

              {/* Cartes — masquées si réduit */}
              {!isCollapsed && (
                <div>
                  {colNotes.map((note) => {
                    const themeColor =
                      themes.find((t) => t.name === note.theme)?.color ||
                      "var(--accent)";
                    return (
                      <div
                        key={note.id}
                        className="note-card"
                        onClick={() => openEdit(note)}
                      >
                        <div className="note-title">{note.title}</div>
                        {note.content && (
                          <div className="note-content">
                            {note.content.slice(0, 80)}
                            {note.content.length > 80 ? "…" : ""}
                          </div>
                        )}
                        {note.meeting_title && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--accent)",
                              marginBottom: 6,
                            }}
                          >
                            📅 {note.meeting_title}
                          </div>
                        )}
                        <div className="note-footer">
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 500,
                              background: `${themeColor}22`,
                              color: themeColor,
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: themeColor,
                                display: "inline-block",
                              }}
                            />
                            {note.theme}
                          </span>
                          <span className="note-author">
                            {note.author?.name?.split(" ")[0]}
                          </span>
                        </div>
                        {note.created_at && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "#dbdbdb",
                              marginTop: 6,
                            }}
                          >
                            🕐{" "}
                            {new Date(note.created_at).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            )}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            marginTop: 10,
                            flexWrap: "wrap",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {STATUSES.filter((st) => st.key !== s.key).map(
                            (st) => (
                              <button
                                key={st.key}
                                className="btn btn-ghost"
                                style={{
                                  fontSize: 10,
                                  padding: "4px 8px",
                                  flex: "1 1 auto",
                                  textAlign: "center",
                                  justifyContent: "center",
                                }}
                                onClick={() =>
                                  requestStatusChange(note, st.key)
                                }
                              >
                                {st.label}
                              </button>
                            ),
                          )}
                          <button
                            className="btn btn-danger"
                            style={{
                              fontSize: 10,
                              padding: "4px 8px",
                              width: "100%",
                              marginTop: 2,
                              textAlign: "center",
                              justifyContent: "center",
                            }}
                            onClick={() => remove(note)}
                          >
                            🗑 Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {colNotes.length === 0 && (
                    <div
                      style={{
                        padding: 16,
                        textAlign: "center",
                        color: "var(--border)",
                        fontSize: 12,
                      }}
                    >
                      —
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal note */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {editNote ? "Modifier la note" : "Nouvelle note"}
            </div>
            <div className="form-group">
              <label className="form-label">Titre *</label>
              <input
                className="form-input"
                value={form.title}
                autoFocus
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Ex: Amélioration des horaires…"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Détails…"
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label className="form-label">Thème</label>
                <select
                  className="form-select"
                  value={form.theme}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, theme: e.target.value }))
                  }
                >
                  {themes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Statut</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="proposition">💡 Proposition</option>
                  <option value="discussion">💬 En discussion</option>
                  <option value="validee">✅ Validée</option>
                  <option value="refusee">❌ Refusée</option>
                </select>
              </div>
            </div>
            {form.status !== "proposition" && (
              <div className="form-group">
                <label className="form-label">Réunion liée</label>
                <select
                  className="form-select"
                  value={form.meeting_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meeting_id: e.target.value }))
                  }
                >
                  <option value="">— Autre / Aucune réunion —</option>
                  {[...meetings]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((m) => {
                      const [y, mo, d] = m.date.split("-");
                      return (
                        <option key={m.id} value={m.id}>
                          {d}/{mo}/{y} · {m.title}
                        </option>
                      );
                    })}
                </select>
              </div>
            )}
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Enregistrement…" : editNote ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal changement statut */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="modal-title">Lier à une réunion ?</div>
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 18,
                lineHeight: 1.6,
              }}
            >
              La note{" "}
              <strong style={{ color: "var(--text)" }}>
                "{pendingStatus.note?.title}"
              </strong>{" "}
              passe en{" "}
              <strong style={{ color: "var(--text)" }}>
                {STATUSES.find((s) => s.key === pendingStatus.newStatus)?.label}
              </strong>
              .<br />
              Souhaitez-vous la lier à une réunion ?
            </div>
            <div className="form-group">
              <label className="form-label">Réunion liée</label>
              <select
                className="form-select"
                value={selectedMeeting}
                onChange={(e) => setSelectedMeeting(e.target.value)}
              >
                <option value="">— Autre / Aucune réunion —</option>
                {[...meetings]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((m) => {
                    const [y, mo, d] = m.date.split("-");
                    return (
                      <option key={m.id} value={m.id}>
                        {d}/{mo}/{y} · {m.title}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowStatusModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={() =>
                  applyStatus(
                    pendingStatus.note,
                    pendingStatus.newStatus,
                    selectedMeeting,
                  )
                }
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nouveau thème */}
      {showNewTheme && (
        <div className="modal-overlay">
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380 }}
          >
            <div className="modal-title">Nouveau thème</div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input
                className="form-input"
                value={themeForm.name}
                autoFocus
                onChange={(e) =>
                  setThemeForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex: Juridique, Sécurité…"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Couleur</label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
                {COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setThemeForm((f) => ({ ...f, color: c }))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border:
                        themeForm.color === c
                          ? "3px solid white"
                          : "2px solid transparent",
                      boxShadow:
                        themeForm.color === c ? `0 0 0 2px ${c}` : "none",
                      transition: "all 0.15s",
                    }}
                  />
                ))}
              </div>
              {themeForm.name && (
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    borderRadius: 20,
                    background: `${themeForm.color}22`,
                    color: themeForm.color,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: themeForm.color,
                      display: "inline-block",
                    }}
                  />
                  {themeForm.name}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowNewTheme(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={saveTheme}
                disabled={saving || !themeForm.name.trim()}
              >
                {saving ? "…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression note */}
      {showDeleteNote && (
        <div className="modal-overlay" onClick={() => setShowDeleteNote(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="modal-title">Supprimer la note</div>
            <div
              style={{
                fontSize: 14,
                color: "var(--muted)",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              Voulez-vous supprimer la note{" "}
              <strong style={{ color: "var(--text)" }}>
                "{showDeleteNote.title}"
              </strong>{" "}
              ?<br />
              <span style={{ fontSize: 13, color: "var(--red)" }}>
                ⚠️ Cette action est irréversible.
              </span>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteNote(null)}
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteNote}
                style={{
                  background: "var(--red)",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression thème */}
      {showDeleteTheme && (
        <div className="modal-overlay" onClick={() => setShowDeleteTheme(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div className="modal-title">Supprimer le thème</div>
            <div
              style={{
                fontSize: 14,
                color: "var(--muted)",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              Voulez-vous supprimer le thème{" "}
              <strong style={{ color: "var(--text)" }}>
                "{showDeleteTheme.name}"
              </strong>{" "}
              ?<br />
              <span style={{ fontSize: 13, color: "var(--orange)" }}>
                ⚠️ Impossible s'il est utilisé par des notes existantes.
              </span>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteTheme(null)}
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteTheme}
                style={{
                  background: "var(--red)",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
