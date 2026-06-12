import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink, Instagram, Youtube, Globe, Edit2, X, Check } from 'lucide-react';

const SOCIAL_PLATFORMS = [
  {
    key: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: '#E1306C',
    prefix: 'instagram.com/',
    placeholder: '@username',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.27 8.27 0 004.84 1.55V7.06a4.85 4.85 0 01-1.07-.37z"/>
      </svg>
    ),
    color: '#000000',
    prefix: 'tiktok.com/@',
    placeholder: '@username',
  },
  {
    key: 'twitter',
    label: 'X / Twitter',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: '#000000',
    prefix: 'x.com/',
    placeholder: '@username',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    prefix: 'youtube.com/@',
    placeholder: '@channel',
  },
  {
    key: 'ebay',
    label: 'eBay Store',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.808 6.434C1.23 6.434 0 7.373 0 9.01v.19h1.776c0-.706.494-1.07 1.032-1.07.588 0 .926.313.926.783 0 .482-.295.66-.744.74l-.787.133C1.196 9.98 0 10.537 0 12.005c0 1.22.864 1.973 2.162 1.973 1.016 0 1.71-.44 2.008-1.095h.044c0 .354.03.704.072.956H5.86a9.483 9.483 0 01-.064-1.18V9.806c0-2.076-1.184-3.372-2.988-3.372zm.18 5.845c-.578 0-.932-.305-.932-.8 0-.52.39-.75 1.136-.892l.384-.073c.264-.048.477-.113.624-.193v.585c0 .79-.514 1.373-1.212 1.373zM8.47 4.5H6.694v9.476h1.791V12.78h.044c.286.617.99 1.348 2.26 1.348 1.793 0 3.044-1.416 3.044-3.725 0-2.318-1.244-3.725-3.044-3.725-1.254 0-1.97.72-2.276 1.357h-.044V4.5zm1.697 7.932c-1.06 0-1.72-.884-1.72-2.029 0-1.145.66-2.029 1.72-2.029s1.72.884 1.72 2.029c0 1.145-.66 2.029-1.72 2.029zm5.71-5.633v7.18h1.79V6.8h-1.79zm.897-2.778c-.597 0-1.074.477-1.074 1.074s.477 1.074 1.074 1.074 1.074-.477 1.074-1.074S17.371 4.02 16.774 4.02zm4.456 2.628c-1.832 0-3.116 1.39-3.116 3.725s1.273 3.725 3.116 3.725c1.24 0 2.042-.5 2.534-1.316l-1.386-.798c-.243.4-.63.62-1.148.62-.838 0-1.375-.566-1.375-1.37h4.1c.013-.16.02-.325.02-.492 0-2.27-1.166-4.094-2.745-4.094zm-1.375 2.935c.06-.75.572-1.365 1.346-1.365.784 0 1.26.59 1.285 1.365H19.855z"/>
      </svg>
    ),
    color: '#e53238',
    prefix: 'ebay.com/usr/',
    placeholder: 'store name',
  },
  {
    key: 'stockx',
    label: 'StockX',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    color: '#006340',
    prefix: 'stockx.com/',
    placeholder: 'profile name',
  },
  {
    key: 'depop',
    label: 'Depop',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">d</text>
      </svg>
    ),
    color: '#FF2300',
    prefix: 'depop.com/',
    placeholder: '@username',
  },
  {
    key: 'website',
    label: 'Website',
    icon: Globe,
    color: '#6366f1',
    prefix: '',
    placeholder: 'https://yoursite.com',
  },
];

// Display-only version for viewing profiles
export function SocialLinksDisplay({ socialLinks }) {
  if (!socialLinks) return null;
  const active = SOCIAL_PLATFORMS.filter(p => socialLinks[p.key]?.trim());
  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {active.map(({ key, label, icon: Icon, color, prefix }) => {
        const handle = socialLinks[key].trim();
        const href = key === 'website'
          ? (handle.startsWith('http') ? handle : `https://${handle}`)
          : `https://${prefix}${handle.replace(/^@/, '')}`;

        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card/60 text-xs font-medium hover:bg-secondary transition-colors"
            style={{ color }}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-foreground">{label}</span>
          </a>
        );
      })}
    </div>
  );
}

// Edit panel embedded in profile page
export default function SocialLinksEditor({ socialLinks = {}, onSave, isSaving }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(socialLinks);

  const handleOpen = () => {
    setValues(socialLinks || {});
    setEditing(true);
  };

  const handleSave = () => {
    // Strip empty strings
    const cleaned = {};
    Object.entries(values).forEach(([k, v]) => { if (v?.trim()) cleaned[k] = v.trim(); });
    onSave(cleaned);
    setEditing(false);
  };

  const active = SOCIAL_PLATFORMS.filter(p => (socialLinks || {})[p.key]?.trim());

  if (!editing) {
    return (
      <div>
        {active.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {active.map(({ key, label, icon: Icon, color, prefix }) => {
              const handle = socialLinks[key].trim();
              const href = key === 'website'
                ? (handle.startsWith('http') ? handle : `https://${handle}`)
                : `https://${prefix}${handle.replace(/^@/, '')}`;
              return (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card/60 text-xs font-medium hover:bg-secondary transition-colors"
                  style={{ color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-foreground">{label}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              );
            })}
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
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
            Add Social Links & Storefronts
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold">Social Links</p>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, color, placeholder }) => (
        <div key={key} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}22` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <Input
            value={values[key] || ''}
            onChange={(e) => setValues(v => ({ ...v, [key]: e.target.value }))}
            placeholder={`${label}: ${placeholder}`}
            className="bg-background h-9 text-sm flex-1"
          />
        </div>
      ))}

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-primary hover:bg-primary/90 mt-1"
        size="sm"
      >
        {isSaving ? 'Saving...' : 'Save Links'}
      </Button>
    </div>
  );
}