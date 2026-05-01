import React from 'react';
import { PLATFORMS } from '@/lib/platformFees';
import { motion } from 'framer-motion';

export default function PlatformSelector({ value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Platform
      </label>
      <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
        {Object.entries(PLATFORMS).map(([key, platform]) => {
          const isActive = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="platformActive"
                  className="absolute inset-0 rounded-xl border-2 border-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="text-lg">{platform.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {platform.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}