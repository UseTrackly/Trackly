import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink, Globe, Edit2, X, AlertCircle, Check } from 'lucide-react';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconInstagram = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const IconTikTok = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.27 8.27 0 004.84 1.55V7.06a4.85 4.85 0 01-1.07-.37z"/>
  </svg>
);

const IconYouTube = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const IconXTwitter = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const IconDiscord = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const IconEbay = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.808 6.434C1.23 6.434 0 7.373 0 9.01v.19h1.776c0-.706.494-1.07 1.032-1.07.588 0 .926.313.926.783 0 .482-.295.66-.744.74l-.787.133C1.196 9.98 0 10.537 0 12.005c0 1.22.864 1.973 2.162 1.973 1.016 0 1.71-.44 2.008-1.095h.044c0 .354.03.704.072.956H5.86a9.483 9.483 0 01-.064-1.18V9.806c0-2.076-1.184-3.372-2.988-3.372zm.18 5.845c-.578 0-.932-.305-.932-.8 0-.52.39-.75 1.136-.892l.384-.073c.264-.048.477-.113.624-.193v.585c0 .79-.514 1.373-1.212 1.373zM8.47 4.5H6.694v9.476h1.791V12.78h.044c.286.617.99 1.348 2.26 1.348 1.793 0 3.044-1.416 3.044-3.725 0-2.318-1.244-3.725-3.044-3.725-1.254 0-1.97.72-2.276 1.357h-.044V4.5zm1.697 7.932c-1.06 0-1.72-.884-1.72-2.029 0-1.145.66-2.029 1.72-2.029s1.72.884 1.72 2.029c0 1.145-.66 2.029-1.72 2.029zm5.71-5.633v7.18h1.79V6.8h-1.79zm.897-2.778c-.597 0-1.074.477-1.074 1.074s.477 1.074 1.074 1.074 1.074-.477 1.074-1.074S17.371 4.02 16.774 4.02zm4.456 2.628c-1.832 0-3.116 1.39-3.116 3.725s1.273 3.725 3.116 3.725c1.24 0 2.042-.5 2.534-1.316l-1.386-.798c-.243.4-.63.62-1.148.62-.838 0-1.375-.566-1.375-1.37h4.1c.013-.16.02-.325.02-.492 0-2.27-1.166-4.094-2.745-4.094zm-1.375 2.935c.06-.75.572-1.365 1.346-1.365.784 0 1.26.59 1.285 1.365H19.855z"/>
  </svg>
);

const IconWhatnot = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3l2.5 5h-5L12 5zm-5 6h10v1.5c0 2.5-2 4.5-5 4.5s-5-2-5-4.5V11z"/>
  </svg>
);

const IconFacebook = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const IconMercari = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1 14.5v-9l7 4.5-7 4.5z"/>
  </svg>
);

const IconStockX = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l4-4 4 4 4-4 4 4M3 7l4 4 4-4 4 4 4-4"/>
  </svg>
);

// ─── Platform Config ──────────────────────────────────────────────────────────

export const SOCIALS = [
  { key: 'instagram', label: 'Instagram', icon: IconInstagram, color: '#E1306C', urlBase: 'https://instagram.com/', placeholder: 'username (without @)' },
  { key: 'tiktok',    label: 'TikTok',    icon: IconTikTok,    color: '#010101', urlBase: 'https://tiktok.com/@', placeholder: 'username (without @)' },
  { key: 'youtube',   label: 'YouTube',   icon: IconYouTube,   color: '#FF0000', urlBase: 'https://youtube.com/@', placeholder: 'channel handle' },
  { key: 'twitter',   label: 'X / Twitter', icon: IconXTwitter, color: '#000000', urlBase: 'https://x.com/', placeholder: 'username (without @)' },
  { key: 'discord',   label: 'Discord',   icon: IconDiscord,   color: '#5865F2', urlBase: 'https://discord.gg/', placeholder: 'invite code or username' },
];

export const STOREFRONTS = [
  { key: 'ebay',      label: 'eBay',      icon: IconEbay,     color: '#e53238', urlBase: 'https://ebay.com/usr/', placeholder: 'store username' },
  { key: 'whatnot',   label: 'Whatnot',   icon: IconWhatnot,  color: '#7C3AED', urlBase: 'https://whatnot.com/user/', placeholder: 'username' },
  { key: 'facebook',  label: 'Facebook Marketplace', icon: IconFacebook, color: '#1877F2', urlBase: 'https://facebook.com/', placeholder: 'profile name or URL' },
  { key: 'mercari',   label: 'Mercari',   icon: IconMercari,  color: '#FF4F00', urlBase: 'https://mercari.com/u/', placeholder: 'user ID or handle' },
  { key: 'stockx',    label: 'StockX',    icon: IconStockX,   color: '#006340', urlBase: 'https://stockx.com/', placeholder: 'profile name' },
  { key: 'website',   label: 'Website',   icon: Globe,        color: '#6366f1', urlBase: '', placeholder: 'https://yoursite.com' },
];

export const ALL_PLATFORMS = [...SOCIALS, ...STOREFRONTS];

// ─── Blocklist ────────────────────────────────────────────────────────────────

const BLOCKED_DOMAINS = [
  // Adult
  'pornhub','xvideos','xhamster','onlyfans','fansly','manyvids','chaturbate','stripchat',
  // Gambling
  'draftkings','fanduel','betmgm','caesars','bovada','bet365','pokerstars',
  // Known scam / phishing patterns (partial)
  'bit.ly','tinyurl','goo.gl','t.co',
  // Crypto / NFT scams
  'nft-drop','freecrypto','claimtoken',
  // Generic unsafe
  'malware','phishing','hack','crack','warez',
];

function isDomainBlocked(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    return BLOCKED_DOMAINS.some(b => host.includes(b));
  } catch {
    return false;
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateHandle(platform, raw) {
  if (!raw?.trim()) return { ok: true }; // empty = fine (clearing)
  const val = raw.trim();

  if (platform.key === 'website') {
    // Must be a valid URL
    const withProto = val.startsWith('http') ? val : `https://${val}`;
    try { new URL(withProto); } catch { return { ok: false, msg: 'Enter a valid website URL.' }; }
    if (isDomainBlocked(withProto)) return { ok: false, msg: 'This website is not allowed on Trackly.' };
    return { ok: true };
  }

  // Reject full URLs containing blocked domains for non-website fields
  if (val.includes('://') || val.includes('.com')) {
    const withProto = val.startsWith('http') ? val : `https://${val}`;
    if (isDomainBlocked(withProto)) return { ok: false, msg: 'This link is not allowed on Trackly.' };
  }

  // Basic: no spaces, reasonably short
  if (val.length > 80) return { ok: false, msg: 'Handle is too long.' };
  return { ok: true };
}

function buildHref(platform, handle) {
  const val = handle.trim().replace(/^@/, '').replace(/^\//, '');
  if (platform.key === 'website') return val.startsWith('http') ? val : `https://${val}`;
  return `${platform.urlBase}${val}`;
}

// ─── Display (read-only, for public profiles) ─────────────────────────────────

export function SocialLinksDisplay({ socialLinks }) {
  if (!socialLinks) return null;

  const activeSocials = SOCIALS.filter(p => socialLinks[p.key]?.trim());
  const activeStores = STOREFRONTS.filter(p => socialLinks[p.key]?.trim());
  if (activeSocials.length === 0 && activeStores.length === 0) return null;

  const Pill = ({ platform }) => {
    const { key, label, icon: Icon, color } = platform;
    const handle = socialLinks[key].trim();
    const href = buildHref(platform, handle);
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-card/60 text-xs font-medium hover:bg-secondary transition-colors"
        style={{ color }}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="text-foreground">{label}</span>
        <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/60" />
      </a>
    );
  };

  return (
    <div className="space-y-2">
      {activeSocials.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeSocials.map(p => <Pill key={p.key} platform={p} />)}
        </div>
      )}
      {activeStores.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeStores.map(p => <Pill key={p.key} platform={p} />)}
        </div>
      )}
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function PlatformField({ platform, value, onChange, error }) {
  const { label, icon: Icon, color, placeholder } = platform;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}22` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${label}: ${placeholder}`}
          className={`flex-1 h-9 text-sm bg-background ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        />
        {value?.trim() && !error && (
          <Check className="w-4 h-4 text-primary shrink-0" />
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 pl-9 text-xs text-destructive">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3 mb-2 first:mt-0">
      {label}
    </p>
  );
}

// ─── Editor (embedded in own profile) ─────────────────────────────────────────

export default function SocialLinksEditor({ socialLinks = {}, onSave, isSaving }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');

  const handleOpen = () => {
    setValues(socialLinks || {});
    setErrors({});
    setGlobalError('');
    setEditing(true);
  };

  const handleChange = (key, raw) => {
    setValues(v => ({ ...v, [key]: raw }));
    // Clear error on change
    setErrors(e => ({ ...e, [key]: '' }));
    setGlobalError('');
  };

  const handleSave = () => {
    const newErrors = {};
    let hasError = false;

    ALL_PLATFORMS.forEach(p => {
      const result = validateHandle(p, values[p.key]);
      if (!result.ok) {
        newErrors[p.key] = result.msg;
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      setGlobalError('Please fix the errors below before saving.');
      return;
    }

    const cleaned = {};
    Object.entries(values).forEach(([k, v]) => { if (v?.trim()) cleaned[k] = v.trim(); });
    onSave(cleaned);
    setEditing(false);
  };

  const activeSocials = SOCIALS.filter(p => (socialLinks || {})[p.key]?.trim());
  const activeStores = STOREFRONTS.filter(p => (socialLinks || {})[p.key]?.trim());
  const hasAny = activeSocials.length > 0 || activeStores.length > 0;

  if (!editing) {
    return (
      <div>
        {hasAny ? (
          <div className="space-y-2">
            {activeSocials.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeSocials.map(({ key, label, icon: Icon, color }) => {
                  const handle = socialLinks[key].trim();
                  const href = buildHref(SOCIALS.find(p => p.key === key), handle);
                  return (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-card/60 text-xs font-medium hover:bg-secondary transition-colors"
                      style={{ color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-foreground">{label}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/60" />
                    </a>
                  );
                })}
              </div>
            )}
            {activeStores.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeStores.map(({ key, label, icon: Icon, color }) => {
                  const handle = socialLinks[key].trim();
                  const href = buildHref(STOREFRONTS.find(p => p.key === key), handle);
                  return (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-card/60 text-xs font-medium hover:bg-secondary transition-colors"
                      style={{ color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-foreground">{label}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/60" />
                    </a>
                  );
                })}
              </div>
            )}
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>
        ) : (
          <button
            onClick={handleOpen}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors w-full justify-center"
          >
            <ExternalLink className="w-4 h-4" />
            Add Socials & Storefronts
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold">Socials & Storefronts</p>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {globalError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {globalError}
        </div>
      )}

      {/* Socials */}
      <SectionLabel label="Socials" />
      <div className="space-y-2">
        {SOCIALS.map(p => (
          <PlatformField
            key={p.key}
            platform={p}
            value={values[p.key] || ''}
            onChange={(v) => handleChange(p.key, v)}
            error={errors[p.key]}
          />
        ))}
      </div>

      {/* Storefronts */}
      <SectionLabel label="Storefronts" />
      <div className="space-y-2">
        {STOREFRONTS.map(p => (
          <PlatformField
            key={p.key}
            platform={p}
            value={values[p.key] || ''}
            onChange={(v) => handleChange(p.key, v)}
            error={errors[p.key]}
          />
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-primary hover:bg-primary/90 mt-4"
        size="sm"
      >
        {isSaving ? 'Saving...' : 'Save Links'}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center mt-2 leading-relaxed">
        Links are visible to all Trackly users. Only add links to platforms you own.
      </p>
    </div>
  );
}