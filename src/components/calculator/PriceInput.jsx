import React from 'react';

export default function PriceInput({ label, value, onChange, placeholder = "0.00" }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
          $
        </span>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          className="w-full bg-card border border-border rounded-xl pl-8 pr-4 py-3.5 text-lg font-semibold placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>
    </div>
  );
}