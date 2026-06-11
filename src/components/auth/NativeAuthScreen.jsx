import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { base44, reinitializeBase44Token } from '@/api/base44Client';

export default function NativeAuthScreen({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await base44.auth.register({ email, password, full_name: fullName });
      }

      const result = await base44.auth.loginViaEmailPassword(email, password);

      // The SDK may return the token at various paths — check all known shapes
      // and also fall back to reading it from localStorage (the SDK may set it itself)
      const token =
        result?.access_token ||
        result?.token ||
        result?.data?.access_token ||
        result?.data?.token ||
        (typeof result === 'string' ? result : null) ||
        localStorage.getItem('base44_access_token') ||
        // Some SDK versions store under a different key — scan for it
        (() => {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('token') || key.includes('session') || key.includes('access'))) {
              const val = localStorage.getItem(key);
              if (val && val.length > 20 && !val.startsWith('{')) return val;
            }
          }
          return null;
        })();

      if (!token) {
        // Log the raw result to help debug unexpected response shapes
        console.error('[NativeAuth] loginViaEmailPassword raw result:', JSON.stringify(result));
        throw new Error('No token returned from login. Please try again.');
      }

      // Persist token to all storage layers (native NSUserDefaults + localStorage)
      await reinitializeBase44Token(token);

      // Fetch the user right here — don't rely on checkAppState's debounce guard
      const currentUser = await base44.auth.me();

      // Pass both token and user up so AuthContext can set state directly
      onSuccess({ token, user: currentUser });
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('already') || msg.includes('exists')) {
        setError('An account with this email already exists. Please sign in.');
      } else if (msg.includes('Invalid') || msg.includes('invalid') || msg.includes('password') || msg.includes('credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('not found') || msg.includes('No user')) {
        setError('No account found. Please create one.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      zIndex: 9999,
    }}>
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <img
          src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png"
          alt="Trackly"
          style={{ height: 48, width: 'auto', marginBottom: 12 }}
        />
        <p style={{ color: '#666', fontSize: 14 }}>
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        key={mode}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: 360 }}
      >
        {/* Full name (register only) */}
        <AnimatePresence>
          {mode === 'register' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: 12, overflow: 'hidden' }}
            >
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#555' }} />
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required={mode === 'register'}
                  autoComplete="name"
                  style={inputStyle}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#555' }} />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#555' }} />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            style={{ ...inputStyle, paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#555' }}
          >
            {showPassword
              ? <EyeOff style={{ width: 16, height: 16 }} />
              : <Eye style={{ width: 16, height: 16 }} />
            }
          </button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#ff8a8a', fontSize: 13, lineHeight: 1.4 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#166534' : '#22c55e',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.2s',
          }}
        >
          {loading
            ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />
            : <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight style={{ width: 16, height: 16 }} />
              </>
          }
        </button>

        {/* Toggle mode */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ color: '#555', fontSize: 14 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            type="button"
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#22c55e', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </motion.form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '13px 14px 13px 42px',
  background: '#141414',
  border: '1px solid #2a2a2a',
  borderRadius: 12,
  color: '#fff',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
};