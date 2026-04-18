// src/context.jsx — Contexte Auth + hook Socket.io
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { login as apiLogin, getMe } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('cse_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cse_token');
    if (token) {
      getMe()
        .then(u => { setUser(u); localStorage.setItem('cse_user', JSON.stringify(u)); })
        .catch(() => { localStorage.removeItem('cse_token'); localStorage.removeItem('cse_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    localStorage.setItem('cse_token', data.token);
    localStorage.setItem('cse_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('cse_token');
    localStorage.removeItem('cse_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// ─── SOCKET HOOK ──────────────────────────────────────────────────────────────
export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cse_token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  const joinChannel = (name) => socketRef.current?.emit('join_channel', name);
  const sendMessage = (channelName, text) => socketRef.current?.emit('send_message', { channelName, text });
  const onMessage   = (cb) => { socketRef.current?.on('new_message', cb); return () => socketRef.current?.off('new_message', cb); };
  const emitTyping  = (channelName, isTyping) => socketRef.current?.emit('typing', { channelName, isTyping });
  const onTyping    = (cb) => { socketRef.current?.on('user_typing', cb); return () => socketRef.current?.off('user_typing', cb); };

  return { socket: socketRef.current, connected, joinChannel, sendMessage, onMessage, emitTyping, onTyping };
}
