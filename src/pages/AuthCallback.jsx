import { useEffect } from 'react';

/**
 * AuthCallback — loaded inside the Capacitor in-app browser after Base44 login.
 *
 * Strategy:
 * 1. Extract the access_token from the URL (query param or hash).
 * 2. Write it to localStorage (shared origin with parent WebView).
 * 3. Redirect to trackly://auth-callback?token=... 
 *    iOS intercepts this custom scheme → fires appUrlOpen in the parent
 *    Capacitor WebView → AuthContext closes the browser and authenticates.
 *
 * NOTE: window.close() does NOT trigger browserFinished for programmatic calls.
 * The custom scheme redirect is the only reliable cross-context signal.
 */

function extractToken() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return search.get('access_token') || hash.get('access_token') || null;
}

export default function AuthCallback() {
  useEffect(() => {
    const token = extractToken();

    if (!token) {
      // No token — just close
      window.location.href = 'trackly://auth-callback?error=no_token';
      return;
    }

    // Write into localStorage so parent WebView can also read it directly
    try {
      localStorage.setItem('base44_access_token', token);
    } catch (_) {}

    // Short delay to ensure localStorage write is flushed, then redirect to
    // the custom scheme — iOS intercepts it and fires appUrlOpen in the app.
    setTimeout(() => {
      window.location.href = `trackly://auth-callback?access_token=${encodeURIComponent(token)}`;
    }, 150);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16,
    }}>
      <img
        src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png"
        alt="Trackly"
        style={{ height: 48, width: 'auto' }}
      />
      <div style={{
        width: 24, height: 24,
        border: '2px solid #22c55e',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#555', fontSize: 13, marginTop: 8 }}>Signing you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}