import React from 'react';
import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {Icon && (
        <div className="p-4 rounded-2xl bg-card border border-border mb-5">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
      {action}
    </motion.div>
  );
}