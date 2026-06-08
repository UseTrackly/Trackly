import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabReset } from '@/lib/TabResetContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Calculator, Package, History, Users, User, X, Menu } from 'lucide-react';

const navItems = [
  { path: '/',           icon: Home,       label: 'Home' },
  { path: '/calculator', icon: Calculator, label: 'Calculator' },
  { path: '/inventory',  icon: Package,    label: 'Inventory' },
  { path: '/history',    icon: History,    label: 'History' },
  { path: '/community',  icon: Users,      label: 'Community' },
  { path: '/profile',    icon: User,       label: 'Profile' },
];

const HIDDEN_PATHS = ['/onboarding', '/onboarding-categories', '/upgrade'];

export default function FloatingNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetTab } = useTabReset();
  const [open, setOpen] = useState(false);

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const currentItem = navItems.find(i => i.path === location.pathname);

  const handleNav = (path) => {
    setOpen(false);
    if (location.pathname === path) {
      resetTab(path);
    } else {
      navigate(path);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 998,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Menu items */}
      <AnimatePresence>
        {open && (
          <div
            style={{
              position: 'fixed',
              bottom: `calc(84px + env(safe-area-inset-bottom, 0px))`,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {navItems.map((item, i) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <motion.button
                  key={item.path}
                  initial={{ opacity: 0, x: 40, scale: 0.85 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.85 }}
                  transition={{ delay: (navItems.length - 1 - i) * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
                  onClick={() => handleNav(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 16px',
                    borderRadius: 40,
                    border: isActive
                      ? '1px solid hsl(var(--primary) / 0.6)'
                      : '1px solid hsl(var(--border))',
                    background: isActive
                      ? 'hsl(var(--primary) / 0.15)'
                      : 'hsl(var(--card))',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    cursor: 'pointer',
                    minWidth: 140,
                    justifyContent: 'flex-end',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground) / 0.8)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {item.label}
                  </span>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={16}
                      style={{ color: isActive ? '#fff' : 'hsl(var(--foreground) / 0.7)' }}
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <div
        style={{
          position: 'fixed',
          bottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
        }}
      >
        <motion.button
          onClick={() => setOpen(v => !v)}
          whileTap={{ scale: 0.92 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: open
              ? 'hsl(var(--foreground) / 0.12)'
              : 'hsl(var(--primary))',
            border: open
              ? '1px solid hsl(var(--border))'
              : '1px solid hsl(var(--primary) / 0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: open
              ? 'none'
              : '0 4px 24px hsl(var(--primary) / 0.45)',
          }}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X size={22} style={{ color: 'hsl(var(--foreground))' }} />
              </motion.span>
            ) : (
              <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                {currentItem ? (
                  <currentItem.icon size={22} style={{ color: '#fff' }} />
                ) : (
                  <Menu size={22} style={{ color: '#fff' }} />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>


      </div>
    </>
  );
}