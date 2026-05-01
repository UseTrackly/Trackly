import React from 'react';
import { PLATFORMS } from '@/lib/platformFees';

export default function PlatformBadge({ platform, size = 'sm' }) {
  const p = PLATFORMS[platform];
  if (!p) return null;

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-secondary font-medium ${sizes[size]}`}>
      <span>{p.icon}</span>
      <span>{p.name}</span>
    </span>
  );
}