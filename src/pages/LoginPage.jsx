// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useAuth } from '../context';
import { registerUser } from '../api';

const ROLES = ['Membre', 'Secrétaire', 'Trésorier', 'Délégué syndicat'];

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [role, setRole]         = useState('Membre');
  const [titulaire, setTitulaire] = useState(true);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try { await login(email, password); }
    catch (e) { setError(e.response?.data?.error || 'Identifiants incorrects'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setError(''); setLoading(true);
    try {
      await registerUser({ name, email, password, role, titulaire });
      setMode('done');
    } catch (e) { setError(e.response?.data?.error || 'Erreur lors de l\'inscription'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 36px', animation: 'slideUp 0.3s ease' }}>

        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 600, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>CSE Connect</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Espace membres du Comité Social et Économique</div>
        </div>

        {mode !== 'done' && (
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {[['login','Connexion'],['register','Créer un compte']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{ flex: 1, padding: 8, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, transition: 'all 0.15s', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--muted)' }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Compte en attente */}
        {mode === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 16, fontFamily: "'Fraunces', serif", marginBottom: 10 }}>Compte créé !</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Votre compte est en attente de validation par un administrateur.<br />Vous pourrez vous connecter dès qu'il sera approuvé.
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setMode('login'); setEmail(''); setPassword(''); }}>
              Retour à la connexion
            </button>
          </div>
        )}

        {/* Connexion */}
        {mode === 'login' && (
          <>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="votre@email.fr" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" />
            </div>
            {error && <div style={{ background: 'rgba(245,101,101,0.1)', border: '1px solid rgba(245,101,101,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }} onClick={handleLogin} disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </>
        )}

        {/* Inscription */}
        {mode === 'register' && (
          <>
            <div className="form-group">
              <label className="form-label">Nom complet *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@entreprise.fr" />
            </div>

            {/* Rôle + Titulaire/Suppléant sur la même ligne */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Rôle</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Statut</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  {[['Titulaire', true], ['Suppléant', false]].map(([label, val]) => (
                    <button key={label} type="button"
                      onClick={() => setTitulaire(val)}
                      style={{
                        flex: 1, padding: '9px 6px', border: `1px solid ${titulaire === val ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 8, background: titulaire === val ? 'rgba(79,124,255,0.15)' : 'transparent',
                        color: titulaire === val ? 'var(--accent)' : 'var(--muted)',
                        cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                        fontWeight: titulaire === val ? 600 : 400, transition: 'all 0.15s',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mot de passe * (min. 6 caractères)</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && <div style={{ background: 'rgba(245,101,101,0.1)', border: '1px solid rgba(245,101,101,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>{error}</div>}

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }}
              onClick={handleRegister} disabled={loading || !name || !email || password.length < 6}>
              {loading ? 'Inscription…' : 'Créer mon compte'}
            </button>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Votre compte sera activé après validation par un administrateur.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
