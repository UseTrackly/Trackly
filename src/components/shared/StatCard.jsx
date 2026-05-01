import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, subValue, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
      )}
    </motion.div>
  );
}