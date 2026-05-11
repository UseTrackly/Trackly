import { useEffect } from 'react';

function extractToken() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return search.get('access_token') || hash.get('access_token') || null;
}

export default function AuthCallback() {
  useEffect(() => {
    const token = extractToken();

    if (!token) {
      window.location.replace('/');
      return;
    }

    // Redirect to the trackly:// deep link — iOS intercepts this from within
    // the in-app browser and fires appUrlOpen in the Capacitor WebView,
    // which closes the browser and sets the auth token.
    window.location.href = `trackly://app?access_token=${encodeURIComponent(token)}`;
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}