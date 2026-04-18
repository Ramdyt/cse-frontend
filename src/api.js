// src/api.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cse_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('cse_token');
    localStorage.removeItem('cse_user');
    window.location.reload();
  }
  return Promise.reject(err);
});

// AUTH
export const login          = (email, password) => api.post('/auth/login', { email, password }).then(r => r.data);
export const getMe          = () => api.get('/auth/me').then(r => r.data);
export const getUsers       = (params={}) => api.get('/auth/users', { params }).then(r => r.data);
export const registerUser   = (data) => api.post('/auth/register', data).then(r => r.data);
export const approveUser    = (id) => api.post(`/auth/approve/${id}`).then(r => r.data);
export const deleteUser     = (id) => api.delete(`/auth/users/${id}`).then(r => r.data);
export const resetPassword  = (id, password) => api.patch(`/auth/users/${id}/password`, { password }).then(r => r.data);
export const updateUser     = (id, data) => api.patch(`/auth/users/${id}`, data).then(r => r.data);

// MESSAGES
export const getChannels    = () => api.get('/messages/channels').then(r => r.data);
export const createChannel  = (name, description) => api.post('/messages/channels', { name, description }).then(r => r.data);
export const deleteChannel  = (id) => api.delete(`/messages/channels/${id}`).then(r => r.data);
export const getMessages    = (ch) => api.get(`/messages/${ch}`).then(r => r.data);
export const sendMessage    = (ch, text) => api.post(`/messages/${ch}`, { text }).then(r => r.data);

// NOTES
export const getNotes       = (params={}) => api.get('/notes', { params }).then(r => r.data);
export const createNote     = (data) => api.post('/notes', data).then(r => r.data);
export const updateNote     = (id, data) => api.patch(`/notes/${id}`, data).then(r => r.data);
export const deleteNote     = (id) => api.delete(`/notes/${id}`).then(r => r.data);

// THEMES
export const getThemes      = () => api.get('/themes').then(r => r.data);
export const createTheme    = (name, color) => api.post('/themes', { name, color }).then(r => r.data);
export const deleteTheme    = (id) => api.delete(`/themes/${id}`).then(r => r.data);

// MEETINGS
export const getMeetings    = () => api.get('/meetings').then(r => r.data);
export const createMeeting  = (data) => api.post('/meetings', data).then(r => r.data);
export const updateMeeting  = (id, data) => api.patch(`/meetings/${id}`, data).then(r => r.data);
export const deleteMeeting  = (id) => api.delete(`/meetings/${id}`).then(r => r.data);
export const setAttendance  = (id, status, replacement_id) => api.post(`/meetings/${id}/attend`, { status, replacement_id }).then(r => r.data);

// DOCUMENTS
export const getDocuments   = (params={}) => api.get('/documents', { params }).then(r => r.data);
export const uploadDocument = (file, category) => {
  const fd = new FormData(); fd.append('file', file); fd.append('category', category);
  return api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const deleteDocument = (id) => api.delete(`/documents/${id}`).then(r => r.data);
export const getDownloadUrl = (id) => `${BASE_URL}/documents/${id}/download`;

export default api;

// ─── DÉLÉGATION ───────────────────────────────────────────────────────────────
export const getDelegationConfig   = ()       => api.get('/delegation/config').then(r => r.data);
export const updateDelegationConfig = (data)  => api.patch('/delegation/config', data).then(r => r.data);
export const getDelegationSummary  = (y, m)   => api.get('/delegation/summary', { params: { year: y, month: m } }).then(r => r.data);
export const getDelegationEntries  = (params) => api.get('/delegation/entries', { params }).then(r => r.data);
export const createDelegationEntry = (data)   => api.post('/delegation/entries', data).then(r => r.data);
export const deleteDelegationEntry = (id)     => api.delete(`/delegation/entries/${id}`).then(r => r.data);
export const getDelegationTransfers = ()      => api.get('/delegation/transfers').then(r => r.data);
export const createTransfer        = (data)   => api.post('/delegation/transfers', data).then(r => r.data);
export const approveTransfer       = (id, status) => api.patch(`/delegation/transfers/${id}`, { status }).then(r => r.data);

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const getNotifications   = ()   => api.get('/delegation/notifications').then(r => r.data);
export const markNotifRead      = (id) => api.patch(`/delegation/notifications/${id}/read`).then(r => r.data);
export const markAllNotifsRead  = ()   => api.patch('/delegation/notifications/read-all').then(r => r.data);

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
export const getVapidKey      = ()    => api.get('/push/vapid-key').then(r => r.data);
export const subscribePush    = (sub) => api.post('/push/subscribe', sub).then(r => r.data);
export const unsubscribePush  = (endpoint) => api.delete('/push/subscribe', { data: { endpoint } }).then(r => r.data);
export const testPush         = ()    => api.post('/push/test').then(r => r.data);

// ─── DÉLÉGATION ADMIN ────────────────────────────────────────────────────────
export const getAllDelegationEntries = () => api.get('/delegation/entries/all').then(r => r.data);
export const updateDelegationEntry   = (id, data) => api.patch(`/delegation/entries/${id}`, data).then(r => r.data);
export const adminCreateEntry        = (data) => api.post('/delegation/entries/admin', data).then(r => r.data);
export const adjustBalance = (data) => api.post('/delegation/adjust', data).then(r => r.data);

// ─── THÈME UTILISATEUR ────────────────────────────────────────────────────────
export const saveUserTheme = (theme) => api.patch('/auth/me/theme', { theme }).then(r => r.data);
