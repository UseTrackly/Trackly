import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Global error boundary — catches any crash before/during React mount
// and renders a visible error screen instead of a black screen.
window.onerror = (message, source, lineno, colno, error) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="background:#0a0a0a;color:#fff;min-height:100vh;padding:32px 24px;font-family:system-ui,sans-serif;box-sizing:border-box;">
        <div style="max-width:480px;margin:0 auto;">
          <div style="color:#22c55e;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">TRACKLY — STARTUP ERROR</div>
          <h1 style="font-size:20px;font-weight:700;margin:0 0 16px;">App failed to load</h1>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:16px;margin-bottom:16px;">
            <div style="font-size:12px;color:#999;margin-bottom:6px;">Error</div>
            <div style="font-size:13px;color:#ff6b6b;word-break:break-word;">${message}</div>
          </div>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:16px;margin-bottom:16px;">
            <div style="font-size:12px;color:#999;margin-bottom:6px;">Location</div>
            <div style="font-size:12px;color:#ccc;">${source || 'unknown'} line ${lineno}:${colno}</div>
          </div>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:16px;margin-bottom:16px;">
            <div style="font-size:12px;color:#999;margin-bottom:6px;">App Config</div>
            <div style="font-size:12px;color:#ccc;font-family:monospace;">
              APP_ID: ${import.meta.env.VITE_BASE44_APP_ID || '(not set)'}<br/>
              BASE_URL: ${import.meta.env.VITE_BASE44_APP_BASE_URL || '(not set)'}<br/>
              FN_VER: ${import.meta.env.VITE_BASE44_FUNCTIONS_VERSION || '(not set)'}
            </div>
          </div>
          ${error?.stack ? `<div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:16px;"><div style="font-size:12px;color:#999;margin-bottom:6px;">Stack</div><pre style="font-size:11px;color:#aaa;white-space:pre-wrap;margin:0;word-break:break-all;">${error.stack}</pre></div>` : ''}
        </div>
      </div>`;
  }
  return false;
};

window.onunhandledrejection = (event) => {
  window.onerror(String(event.reason), '', 0, 0, event.reason);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)