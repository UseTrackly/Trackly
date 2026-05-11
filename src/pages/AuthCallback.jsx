import { useEffect } from 'react';

/**
 * AuthCallback — loaded inside the Capacitor in-app browser after Base44 login.
 *
 * Strategy:
 * 1. Extract the access_token from the URL (query param or hash).
 * 2. Write it to localStorage so the PARENT Capacitor WebView can read it
 *    (both contexts share the same origin: usetrackly.base44.app).
 * 3. Close the in-app browser.
 * 4. The parent app's AuthContext listens for `browserFinished` from
 *    @capacitor/browser and calls checkAppState(), which reads the token
 *    from localStorage and authenticates.
 */

function extractToken() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return search.get('access_token') || hash.get('access_token') || null;
}

export default function AuthCallback() {
  useEffect(() => {
    const token = extractToken();

    if (token) {
      // Write into the same localStorage slot the parent WebView reads from
      try {
        localStorage.setItem('base44_access_token', token);
      } catch (_) {}
    }

    // Close the in-app browser — this triggers `browserFinished` in the parent
    // Capacitor WebView, which then calls checkAppState() and picks up the token.
    // Use a tiny delay so the localStorage write flushes before the window closes.
    const timer = setTimeout(() => {
      try {
        // This closes the Capacitor Browser overlay from within the page
        window.close();
      } catch (_) {}
    }, 100);

    return () => clearTimeout(timer);
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