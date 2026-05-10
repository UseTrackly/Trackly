import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide splash after 1.8s, then call onComplete 500ms later (fade duration)
    // Hard fallback at 3s in case AnimatePresence onExitComplete never fires
    const hideTimer = setTimeout(() => setVisible(false), 1800);
    const fallbackTimer = setTimeout(() => onComplete?.(), 3000);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <AnimatePresence onExitComplete={() => onComplete?.()}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.35, scale: 1.2 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary blur-[120px]"
            />
          </div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative flex flex-col items-center gap-5"
          >
            <img
              src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png"
              alt="Trackly"
              className="h-20 w-auto"
            />
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase"
            >
              Built for serious resellers
            </motion.p>
          </motion.div>

          {/* Bottom loader bar */}
          <motion.div
            className="absolute bottom-16 left-1/2 -translate-x-1/2 h-[2px] w-24 rounded-full bg-border overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.6, duration: 1.0, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}