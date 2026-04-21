// src/App.jsx — CSE Connect avec responsive mobile
import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Notes from "./pages/Notes";
import Meetings from "./pages/Meetings";
import Documents from "./pages/Documents";
import Admin from "./pages/Admin";
import Delegation from "./pages/Delegation";
import Notifications from "./components/Notifications";
import { saveUserTheme } from "./api";

// ─── THÈMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  Cosmos: {
    label: "Cosmos",
    icon: "🌌",
    "--bg": "#0f1117",
    "--surface": "#181c27",
    "--surface2": "#1f2436",
    "--border": "#2a3050",
    "--text": "#e8eaf6",
    "--muted": "#7b83a8",
    "--accent": "#4f7cff",
    "--accent2": "#7c5cfc",
    "--green": "#3ecf8e",
    "--orange": "#f5a623",
    "--red": "#f56565",
  },
  Forêt: {
    label: "Forêt",
    icon: "🌿",
    "--bg": "#0d1410",
    "--surface": "#131f18",
    "--surface2": "#1a2a20",
    "--border": "#253d2e",
    "--text": "#e0ede5",
    "--muted": "#6b9278",
    "--accent": "#3ecf8e",
    "--accent2": "#27ae73",
    "--green": "#52d98f",
    "--orange": "#f0a500",
    "--red": "#e05555",
  },
  Océan: {
    label: "Océan",
    icon: "🌊",
    "--bg": "#080e1a",
    "--surface": "#0e1829",
    "--surface2": "#152038",
    "--border": "#1e3050",
    "--text": "#d6e8f8",
    "--muted": "#5b86a8",
    "--accent": "#00b4d8",
    "--accent2": "#0077b6",
    "--green": "#3ecf8e",
    "--orange": "#f5a623",
    "--red": "#ef5350",
  },
  Soleil: {
    label: "Soleil",
    icon: "☀️",
    "--bg": "#fafaf8",
    "--surface": "#ffffff",
    "--surface2": "#f0efe8",
    "--border": "#e2e0d8",
    "--text": "#1a1a2e",
    "--muted": "#6b6b80",
    "--accent": "#e07b00",
    "--accent2": "#c0395f",
    "--green": "#27ae60",
    "--orange": "#e67e22",
    "--red": "#e74c3c",
  },
  Cerise: {
    label: "Cerise",
    icon: "🍒",
    "--bg": "#130a0e",
    "--surface": "#1e1015",
    "--surface2": "#28151c",
    "--border": "#3d1f2a",
    "--text": "#f5e6ea",
    "--muted": "#9e6b78",
    "--accent": "#e05585",
    "--accent2": "#c0395f",
    "--green": "#3ecf8e",
    "--orange": "#f5a623",
    "--red": "#f56565",
  },
  Ardoise: {
    label: "Ardoise",
    icon: "🪨",
    "--bg": "#0e1117",
    "--surface": "#161b22",
    "--surface2": "#1c2128",
    "--border": "#30363d",
    "--text": "#c9d1d9",
    "--muted": "#6e7681",
    "--accent": "#58a6ff",
    "--accent2": "#bc8cff",
    "--green": "#3fb950",
    "--orange": "#d29922",
    "--red": "#f85149",
  },
  Améthyste: {
    label: "Améthyste",
    icon: "💜",
    "--bg": "#100d1a",
    "--surface": "#18132a",
    "--surface2": "#211a38",
    "--border": "#342654",
    "--text": "#ede8f8",
    "--muted": "#8a7aaa",
    "--accent": "#a78bfa",
    "--accent2": "#7c3aed",
    "--green": "#3ecf8e",
    "--orange": "#f59e0b",
    "--red": "#f56565",
  },
  Minuit: {
    label: "Minuit",
    icon: "🌙",
    "--bg": "#05070f",
    "--surface": "#0a0d1a",
    "--surface2": "#0f1225",
    "--border": "#1a1f3a",
    "--text": "#c8d0f0",
    "--muted": "#4a5280",
    "--accent": "#6d8fff",
    "--accent2": "#5c4dff",
    "--green": "#3ecf8e",
    "--orange": "#ffb347",
    "--red": "#ff6b6b",
  },
};

function useTheme(userTheme) {
  // Initialiser depuis le compte utilisateur (BDD), fallback localStorage, fallback Cosmos
  const [theme, setThemeState] = useState(() => {
    if (userTheme && THEMES[userTheme]) return userTheme;
    try {
      return localStorage.getItem("cse-theme") || "Cosmos";
    } catch {
      return "Cosmos";
    }
  });

  // Sync si le thème du user change (ex: après login)
  useEffect(() => {
    if (userTheme && THEMES[userTheme] && userTheme !== theme) {
      setThemeState(userTheme);
    }
  }, [userTheme]);

  // Appliquer le thème au DOM
  useEffect(() => {
    const t = THEMES[theme] || THEMES["Cosmos"];
    Object.entries(t).forEach(([k, v]) => {
      if (k.startsWith("--")) document.documentElement.style.setProperty(k, v);
    });
    try {
      localStorage.setItem("cse-theme", theme);
    } catch {}
  }, [theme]);

  // Sauvegarder en BDD + mettre à jour l'état local
  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    try {
      await saveUserTheme(newTheme);
    } catch {}
  };

  return [theme, setTheme];
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,300;0,600;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0f1117;
    --surface: #181c27;
    --surface2: #1f2436;
    --border: #2a3050;
    --accent: #4f7cff;
    --accent2: #7c5cfc;
    --green: #3ecf8e;
    --orange: #f5a623;
    --red: #f56565;
    --text: #e8eaf6;
    --muted: #7b83a8;
    --radius: 12px;
    --nav-h: 64px; /* hauteur barre nav mobile */
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg); color: var(--text);
    min-height: 100vh;
    /* évite le scroll horizontal sur mobile */
    overflow-x: hidden;
  }

  /* ─── LAYOUT PRINCIPAL ─────────────────────────────────────────────────── */
  .app { display: flex; height: 100vh; overflow: hidden; }

  /* ─── SIDEBAR DESKTOP ──────────────────────────────────────────────────── */
  .sidebar {
    width: 220px; min-width: 220px; background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; z-index: 10;
    transition: transform 0.25s ease;
  }
  .sidebar-brand { padding: 24px 20px 20px; border-bottom: 1px solid var(--border); }
  .brand-title {
    font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.1;
  }
  .brand-sub { font-size: 11px; color: var(--muted); margin-top: 3px; letter-spacing: 0.05em; text-transform: uppercase; }
  .nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: 8px; cursor: pointer; font-size: 14px; color: var(--muted);
    transition: all 0.15s; font-weight: 400; border: none; background: none;
    width: 100%; text-align: left;
  }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active {
    background: linear-gradient(135deg, rgba(79,124,255,0.18), rgba(124,92,252,0.12));
    color: var(--text); font-weight: 500;
  }
  .nav-item.active .nav-icon { color: var(--accent); }
  .nav-icon { font-size: 18px; width: 22px; text-align: center; flex-shrink: 0; }
  .sidebar-user {
    padding: 12px 16px; border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px;
  }
  .user-info .name { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .user-info .role { font-size: 11px; color: var(--muted); }

  /* ─── NAVIGATION MOBILE BAS D'ÉCRAN ────────────────────────────────────── */
  .mobile-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    height: var(--nav-h);
    background: var(--surface);
    border-top: 1px solid var(--border);
    z-index: 100;
    padding: 0 4px;
    padding-bottom: env(safe-area-inset-bottom); /* iPhone notch */
  }
  .mobile-nav-inner {
    display: flex; align-items: center; justify-content: space-around;
    height: 100%;
  }
  .mobile-nav-item {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; padding: 6px 8px; border-radius: 10px; cursor: pointer;
    border: none; background: none; color: var(--muted);
    font-family: 'DM Sans', sans-serif; transition: all 0.15s;
    flex: 1; min-width: 0;
  }
  .mobile-nav-item.active { color: var(--accent); }
  .mobile-nav-item.active .mobile-nav-icon { background: rgba(79,124,255,0.15); }
  .mobile-nav-icon {
    font-size: 20px; width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .mobile-nav-label { font-size: 9px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50px; }

  /* Menu "Plus" mobile */
  .mobile-more-panel {
    position: fixed; bottom: var(--nav-h); left: 0; right: 0;
    background: var(--surface); border-top: 1px solid var(--border);
    z-index: 99; padding: 12px;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    animation: slideUp 0.2s ease;
  }
  .mobile-more-item {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 12px 8px; border-radius: 10px; cursor: pointer; border: none;
    background: var(--surface2); color: var(--muted);
    font-family: 'DM Sans', sans-serif; font-size: 12px; transition: all 0.15s;
  }
  .mobile-more-item.active { background: rgba(79,124,255,0.15); color: var(--accent); }
  .mobile-more-item .icon { font-size: 22px; }

  /* Overlay pour fermer le menu "plus" */
  .mobile-overlay {
    display: none; position: fixed; inset: 0; z-index: 98;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
  }
  .mobile-overlay.visible { display: block; }

  /* ─── MAIN ──────────────────────────────────────────────────────────────── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
  .page-header {
    padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
    background: var(--surface); display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .page-title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600; }
  .page-subtitle { font-size: 13px; color: var(--muted); margin-top: 2px; }
  .content { flex: 1; overflow-y: auto; padding: 20px 24px; -webkit-overflow-scrolling: touch; }

  /* ─── AVATAR ────────────────────────────────────────────────────────────── */
  .avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; flex-shrink: 0; color: #fff;
  }
  .avatar.sm { width: 28px; height: 28px; font-size: 11px; }
  .avatar.xs { width: 24px; height: 24px; font-size: 10px; }

  /* ─── BOUTONS ───────────────────────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
    border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer;
    border: none; transition: all 0.15s; font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #3a6bef; transform: translateY(-1px); }
  .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
  .btn-ghost:hover:not(:disabled) { background: var(--surface2); color: var(--text); }
  .btn-danger { background: rgba(245,101,101,0.15); color: var(--red); border: 1px solid rgba(245,101,101,0.3); }

  /* ─── CARD ──────────────────────────────────────────────────────────────── */
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }

  /* ─── BADGE ─────────────────────────────────────────────────────────────── */
  .badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .badge-idee { background: rgba(79,124,255,0.15); color: var(--accent); }
  .badge-discussion { background: rgba(245,166,35,0.15); color: var(--orange); }
  .badge-validee { background: rgba(62,207,142,0.15); color: var(--green); }

  /* ─── STATS ─────────────────────────────────────────────────────────────── */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 18px; position: relative; overflow: hidden; animation: slideUp 0.3s ease both;
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
  }
  .stat-value { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 600; line-height: 1; }
  .stat-label { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .stat-icon { font-size: 22px; margin-bottom: 8px; }
  .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .activity-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .activity-item:last-child { border-bottom: none; }
  .activity-text { font-size: 13px; line-height: 1.4; }
  .activity-time { font-size: 11px; color: var(--muted); margin-top: 2px; }

  /* ─── CHAT ──────────────────────────────────────────────────────────────── */
  .chat-layout { display: flex; height: calc(100vh - 73px); overflow: hidden; }
  .chat-sidebar { width: 200px; border-right: 1px solid var(--border); background: var(--surface); padding: 14px 8px; flex-shrink: 0; overflow-y: auto; }
  .chat-sidebar-title { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; padding: 0 8px; margin-bottom: 8px; }
  .channel-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--muted); transition: all 0.15s; }
  .channel-item:hover { background: var(--surface2); color: var(--text); }
  .channel-item.active { background: rgba(79,124,255,0.15); color: var(--accent); }
  .channel-hash { color: var(--muted); font-size: 16px; }
  .chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .chat-header { padding: 14px 16px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; -webkit-overflow-scrolling: touch; }
  .message { display: flex; gap: 10px; }
  .message.me { flex-direction: row-reverse; }
  .msg-bubble { max-width: 75%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; background: var(--surface2); border: 1px solid var(--border); word-break: break-word; }
  .message.me .msg-bubble { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; border: none; }
  .msg-meta { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .message.me .msg-meta { text-align: right; }
  .msg-name { font-size: 12px; font-weight: 500; margin-bottom: 4px; color: var(--muted); }
  .chat-input-area { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
  .chat-input-row { display: flex; gap: 8px; align-items: center; }
  .chat-input { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; color: var(--text); font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border 0.15s; }
  .chat-input:focus { border-color: var(--accent); }
  .send-btn { width: 40px; height: 40px; border-radius: 10px; background: var(--accent); border: none; color: #fff; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
  .send-btn:hover:not(:disabled) { background: #3a6bef; }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ─── NOTES ─────────────────────────────────────────────────────────────── */
  .notes-toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
  .theme-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .theme-tab { padding: 6px 14px; border-radius: 20px; font-size: 12px; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--muted); transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
  .theme-tab:hover { border-color: var(--accent); color: var(--accent); }
  .theme-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .notes-columns { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .notes-col-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .col-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .note-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 10px; cursor: pointer; transition: all 0.15s; }
  .note-card:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(79,124,255,0.1); }
  .note-title { font-size: 13px; font-weight: 500; margin-bottom: 6px; }
  .note-content { font-size: 12px; color: var(--muted); line-height: 1.5; margin-bottom: 8px; }
  .note-footer { display: flex; align-items: center; justify-content: space-between; }
  .note-author { font-size: 11px; color: var(--muted); }

  /* ─── RÉUNIONS ──────────────────────────────────────────────────────────── */
  .meetings-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
  .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
  .cal-header { text-align: center; font-size: 11px; color: var(--muted); padding: 6px 0; font-weight: 500; }
  .cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.15s; position: relative; }
  .cal-day:hover { background: var(--surface2); }
  .cal-day.has-meeting { color: var(--accent); font-weight: 600; }
  .cal-day.has-meeting::after { content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }
  .cal-day.today { background: rgba(79,124,255,0.15); color: var(--accent); }
  .meeting-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 10px; cursor: pointer; transition: all 0.15s; border-left: 3px solid var(--accent); }
  .meeting-card:hover { box-shadow: 0 4px 20px rgba(79,124,255,0.08); }
  .meeting-card.past { border-left-color: var(--muted); opacity: 0.7; }
  .meeting-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
  .meeting-meta { font-size: 12px; color: var(--muted); display: flex; gap: 10px; flex-wrap: wrap; }
  .meeting-attendees { display: flex; margin-top: 8px; }
  .meeting-attendees .avatar { margin-left: -6px; border: 2px solid var(--surface); }
  .meeting-attendees .avatar:first-child { margin-left: 0; }
  .agenda-list { list-style: none; }
  .agenda-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .agenda-item:last-child { border-bottom: none; }
  .agenda-num { width: 22px; height: 22px; border-radius: 50%; background: rgba(79,124,255,0.15); color: var(--accent); font-size: 11px; font-weight: 600; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }

  /* ─── DOCUMENTS ─────────────────────────────────────────────────────────── */
  .doc-toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; }
  .search-input { flex: 1; min-width: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px; color: var(--text); font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border 0.15s; }
  .search-input:focus { border-color: var(--accent); }
  .docs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .doc-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; transition: all 0.15s; display: flex; flex-direction: column; gap: 10px; }
  .doc-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
  .doc-icon-row { display: flex; align-items: flex-start; gap: 10px; }
  .doc-icon { font-size: 28px; flex-shrink: 0; }
  .doc-name { font-size: 13px; font-weight: 500; line-height: 1.3; word-break: break-word; }
  .doc-meta { font-size: 11px; color: var(--muted); }
  .doc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; flex-wrap: wrap; gap: 6px; }
  .cat-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .upload-area { border: 2px dashed var(--border); border-radius: 10px; padding: 28px; text-align: center; cursor: pointer; transition: all 0.15s; margin-bottom: 16px; }
  .upload-area:hover { border-color: var(--accent); background: rgba(79,124,255,0.04); }
  .upload-icon { font-size: 32px; margin-bottom: 8px; }
  .upload-text { font-size: 14px; color: var(--muted); }

  /* ─── MODAL ─────────────────────────────────────────────────────────────── */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; width: 90%; max-width: 560px; max-height: 92vh; overflow-y: auto; animation: slideUp 0.25s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .modal-title { font-family: 'Fraunces', serif; font-size: 20px; margin-bottom: 18px; }
  .form-group { margin-bottom: 14px; }
  .form-label { font-size: 11px; color: var(--muted); margin-bottom: 6px; display: block; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; }
  .form-input, .form-textarea, .form-select {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 11px 14px; color: var(--text); font-size: 14px;
    font-family: 'DM Sans', sans-serif; outline: none; transition: border 0.15s;
    /* iOS fix */
    -webkit-appearance: none; appearance: none;
  }
  .form-input:focus, .form-textarea:focus, .form-select:focus { border-color: var(--accent); }
  .form-textarea { resize: vertical; min-height: 80px; }
  .form-select option { background: var(--surface2); }
  .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

  /* ─── DIVERS ────────────────────────────────────────────────────────────── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted); }
  .section-title { font-family: 'Fraunces', serif; font-size: 16px; margin-bottom: 14px; }
  .divider { height: 1px; background: var(--border); margin: 14px 0; }
  .empty-state { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 14px; }
  .empty-state .icon { font-size: 36px; margin-bottom: 10px; }
  .flex { display: flex; } .gap-2 { gap: 8px; } .items-center { align-items: center; } .ml-auto { margin-left: auto; }

  /* ─── RESPONSIVE TABLETTE (≤ 1024px) ───────────────────────────────────── */
  @media (max-width: 1024px) {
    .sidebar { width: 180px; min-width: 180px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .dash-grid { grid-template-columns: 1fr; }
    .meetings-layout { grid-template-columns: 1fr; }
    .notes-columns { grid-template-columns: repeat(2, 1fr); }
    .docs-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  }

  /* ─── RESPONSIVE MOBILE (≤ 768px) ──────────────────────────────────────── */
  @media (max-width: 768px) {
    /* Masquer sidebar, afficher nav bas */
    .sidebar { display: none; }
    .mobile-nav { display: flex; }

    /* Contenu prend tout l'écran, avec espace pour nav bas */
    .main { height: 100vh; }
    .content { padding: 14px 14px calc(var(--nav-h) + 14px); }
    .page-header { padding: 14px 16px 12px; }
    .page-title { font-size: 18px; }
    .page-subtitle { font-size: 12px; }

    /* Stats en 2 colonnes sur mobile */
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
    .stat-card { padding: 14px; }
    .stat-value { font-size: 24px; }
    .stat-icon { font-size: 18px; margin-bottom: 6px; }

    /* Dashboard en colonne unique */
    .dash-grid { grid-template-columns: 1fr; gap: 12px; }

    /* Notes : 1 colonne sur mobile, scroll horizontal */
    .notes-columns {
      grid-template-columns: repeat(4, 280px);
      overflow-x: auto;
      padding-bottom: 8px;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
    }
    .notes-columns > div { scroll-snap-align: start; }
    .notes-toolbar { gap: 8px; }

    /* Réunions : 1 colonne */
    .meetings-layout { grid-template-columns: 1fr; gap: 14px; }

    /* Documents : 1 colonne */
    .docs-grid { grid-template-columns: 1fr; }
    .doc-toolbar { flex-wrap: wrap; }

    /* Chat : masquer sidebar canaux sur mobile */
    .chat-layout { height: calc(100vh - var(--nav-h)); flex-direction: column; }
    .chat-sidebar { display: none; }
    .chat-sidebar.mobile-visible { display: flex; flex-direction: column; position: fixed; left: 0; top: 0; bottom: var(--nav-h); width: 240px; z-index: 200; box-shadow: 4px 0 20px rgba(0,0,0,0.4); }
    .chat-main { height: 100%; }
    .chat-messages { padding: 12px; }
    .msg-bubble { max-width: 85%; }

    /* Modal : prend toute la largeur, s'ouvre depuis le bas */
    .modal { border-radius: 20px 20px 0 0; padding: 20px 16px; max-height: 88vh; width: 100%; }
    .modal-title { font-size: 18px; }

    /* Boutons plus grands sur mobile (touch targets) */
    .btn { padding: 10px 16px; font-size: 14px; }
    .form-input, .form-textarea, .form-select { font-size: 16px; /* évite zoom iOS */ padding: 12px 14px; }

    /* Card padding réduit */
    .card { padding: 14px; }
    .section-title { font-size: 15px; }
  }

  /* ─── RESPONSIVE PETIT MOBILE (≤ 380px) ────────────────────────────────── */
  @media (max-width: 380px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .content { padding: 10px 10px calc(var(--nav-h) + 10px); }
    .mobile-nav-label { display: none; }
    .mobile-nav-icon { width: 40px; height: 40px; font-size: 22px; }
  }

  /* ─── TOUCH IMPROVEMENTS ────────────────────────────────────────────────── */
  @media (hover: none) {
    /* Sur écran tactile, désactiver les hover qui restent bloqués */
    .note-card:hover { transform: none; box-shadow: none; }
    .doc-card:hover { transform: none; box-shadow: none; }
    .btn-primary:hover:not(:disabled) { transform: none; }
    /* Agrandir les zones cliquables */
    .nav-item { padding: 12px; }
    .theme-tab { padding: 8px 16px; }
  }
`;

// ─── CONFIG PAGES ─────────────────────────────────────────────────────────────
const PAGES = [
  { id: "dashboard", label: "Accueil", icon: "⊞", mobileLabel: "Accueil" },
  { id: "chat", label: "Messagerie", icon: "💬", mobileLabel: "Messages" },
  { id: "notes", label: "Notes & Idées", icon: "📝", mobileLabel: "Notes" },
  { id: "meetings", label: "Réunions", icon: "📅", mobileLabel: "Réunions" },
  { id: "docs", label: "Documents", icon: "📁", mobileLabel: "Docs" },
  {
    id: "delegation",
    label: "Délégation",
    icon: "⏱",
    mobileLabel: "Délégation",
    extra: true,
  },
  {
    id: "admin",
    label: "Administration",
    icon: "⚙️",
    mobileLabel: "Admin",
    extra: true,
    adminOnly: true,
  },
];

const PAGE_INFO = {
  dashboard: { title: "Tableau de bord", sub: (n) => `Bienvenue, ${n} 👋` },
  chat: { title: "Messagerie", sub: () => "Échangez avec l'équipe" },
  notes: { title: "Notes & Idées", sub: () => "Gérez vos idées par thème" },
  meetings: { title: "Réunions", sub: () => "Planifiez vos réunions" },
  docs: { title: "Documents", sub: () => "Partagez vos fichiers" },
  delegation: {
    title: "Délégation",
    sub: () => "Suivi des heures de délégation",
  },
  admin: { title: "Administration", sub: () => "Gestion des membres du CSE" },
};

// Pages affichées dans la barre mobile principale (les 4 premières)
const MOBILE_MAIN = ["dashboard", "chat", "notes", "meetings"];

// ─── INNER APP ────────────────────────────────────────────────────────────────
function InnerApp() {
  const { user, logout, loading } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [showMore, setShowMore] = useState(false);
  const [theme, setTheme] = useTheme(user?.theme);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Hooks avant les return conditionnels ✓

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            color: "var(--muted)",
            fontFamily: "'Fraunces', serif",
            fontSize: 18,
          }}
        >
          CSE Connect…
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const info = PAGE_INFO[page] || PAGE_INFO.dashboard;

  const visiblePages = PAGES.filter((p) => !p.adminOnly || user.is_admin);
  const mobileMain = visiblePages.filter((p) => MOBILE_MAIN.includes(p.id));
  const mobileExtra = visiblePages.filter((p) => !MOBILE_MAIN.includes(p.id));

  const navigate = (id) => {
    setPage(id);
    setShowMore(false);
    setShowThemePicker(false);
  };

  return (
    <div className="app">
      {/* ── SIDEBAR DESKTOP ── */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-title">
            CSE
            <br />
            Connect
          </div>
          <div className="brand-sub">Espace membres</div>
        </div>
        <nav className="nav">
          {visiblePages.map((p) => (
            <button
              key={p.id}
              className={`nav-item ${page === p.id ? "active" : ""}`}
              onClick={() => navigate(p.id)}
            >
              <span className="nav-icon">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </nav>
        <div
          className="sidebar-user"
          style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="avatar">
              {user.avatar || user.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
              <div className="name">{user.name}</div>
              <div className="role">
                {user.role}
                {user.titulaire !== undefined && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    · {user.titulaire ? "Titulaire" : "Suppléant"}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Notifications + déconnexion sous le nom */}
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1 }}>
              <Notifications />
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 12,
                padding: "5px 10px",
                fontFamily: "'DM Sans',sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--red)";
                e.currentTarget.style.borderColor = "var(--red)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              ⏻
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="main">
        {page !== "chat" && (
          <div className="page-header">
            <div>
              <div className="page-title">{info.title}</div>
              <div className="page-subtitle">
                {info.sub(user.name?.split(" ")[0])}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Choix du thème — uniquement sur le dashboard */}
              {page === "dashboard" && (
                <div style={{ position: "relative" }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => setShowThemePicker((o) => !o)}
                  >
                    Choix du thème
                  </button>
                  {showThemePicker && (
                    <>
                      {/* Overlay invisible pour fermer en cliquant dehors */}
                      <div
                        onClick={() => setShowThemePicker(false)}
                        style={{ position: "fixed", inset: 0, zIndex: 199 }}
                      />
                      {/* Popover */}
                      <div
                        style={{
                          position: "absolute",
                          top: "110%",
                          right: 0,
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                          zIndex: 200,
                          animation: "slideUp 0.15s ease",
                          minWidth: 200,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 10,
                          }}
                        >
                          Thème de couleurs
                        </div>
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                        >
                          {Object.entries(THEMES).map(([key, t]) => {
                            const isActive = theme === key;
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  setTheme(key);
                                  setShowThemePicker(false);
                                }}
                                title={t.label}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  border: "none",
                                  background: t["--accent"],
                                  cursor: "pointer",
                                  padding: 0,
                                  outline: isActive
                                    ? "2px solid var(--text)"
                                    : "2px solid transparent",
                                  outlineOffset: 2,
                                  transition: "all 0.15s",
                                  transform: isActive
                                    ? "scale(1.2)"
                                    : "scale(1)",
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <div
          className={page === "chat" ? "" : "content"}
          style={
            page === "chat"
              ? {
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }
              : {}
          }
        >
          {page === "dashboard" && <Dashboard onNavigate={navigate} />}
          {page === "chat" && <Chat />}
          {page === "notes" && <Notes />}
          {page === "meetings" && <Meetings />}
          {page === "docs" && <Documents />}
          {page === "delegation" && <Delegation />}
          {page === "admin" && <Admin />}
        </div>
      </div>

      {/* ── OVERLAY pour fermer le menu "Plus" ── */}
      <div
        className={`mobile-overlay ${showMore ? "visible" : ""}`}
        onClick={() => setShowMore(false)}
      />

      {/* ── PANEL "Plus" ── */}
      {showMore && (
        <div className="mobile-more-panel">
          {mobileExtra.map((p) => (
            <button
              key={p.id}
              className={`mobile-more-item ${page === p.id ? "active" : ""}`}
              onClick={() => navigate(p.id)}
            >
              <span className="icon">{p.icon}</span>
              {p.mobileLabel}
            </button>
          ))}
          {/* Thème */}
          <button
            className="mobile-more-item"
            onClick={() => {
              setShowMore(false);
              setShowThemePicker((o) => !o);
            }}
          >
            <span className="icon">{THEMES[theme]?.icon}</span>
            Thème
          </button>
          {/* Profil / Déconnexion */}
          <button className="mobile-more-item" onClick={logout}>
            <span className="icon">⏻</span>
            Déconnexion
          </button>
        </div>
      )}

      {/* ── Picker thème mobile (overlay) ── */}
      {showThemePicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowThemePicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              background: "var(--surface)",
              borderRadius: "20px 20px 0 0",
              padding: "16px",
              paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
              animation: "slideUp 0.2s ease",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textAlign: "center",
              }}
            >
              Choisir un thème
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTheme(key);
                    setShowThemePicker(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    background:
                      theme === key ? "var(--surface2)" : "transparent",
                    border: `1px solid ${theme === key ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: theme === key ? "var(--accent)" : "var(--text)",
                    fontSize: 13,
                    fontFamily: "'DM Sans',sans-serif",
                    fontWeight: theme === key ? 600 : 400,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{ flex: 1, textAlign: "left" }}>{t.label}</span>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[t["--accent"], t["--accent2"], t["--green"]].map(
                      (col, i) => (
                        <div
                          key={i}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: col,
                          }}
                        />
                      ),
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NAV BAS MOBILE ── */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {mobileMain.map((p) => (
            <button
              key={p.id}
              className={`mobile-nav-item ${page === p.id ? "active" : ""}`}
              onClick={() => navigate(p.id)}
            >
              <div className="mobile-nav-icon">{p.icon}</div>
              <span className="mobile-nav-label">{p.mobileLabel}</span>
            </button>
          ))}
          {/* Bouton "Plus" */}
          <button
            className={`mobile-nav-item ${showMore ? "active" : ""}`}
            onClick={() => setShowMore((o) => !o)}
          >
            <div className="mobile-nav-icon" style={{ fontSize: 22 }}>
              {showMore ? "✕" : "···"}
            </div>
            <span className="mobile-nav-label">Plus</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{css}</style>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </>
  );
}
