import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Calculator, Package, Users, MessageCircle,
  User, Star, Settings, LogOut, X, ChevronRight
} from 'lucide-react';
import { useTabReset } from '@/lib/TabResetContext';
import { base44 } from '@/api/base44Client';

const MAIN_NAV = [
  { path: '/',           icon: Home,          label: 'Home',        emoji: '🏠' },
  { path: '/calculator', icon: Calculator,    label: 'Calculator',  emoji: '🧮' },
  { path: '/inventory',  icon: Package,       label: 'Inventory',   emoji: '📦' },
  { path: '/community',  icon: Users,         label: 'Community',   emoji: '👥' },
  { path: '__messages',  icon: MessageCircle, label: 'Messages',    emoji: '💬' },
  { path: '/profile',    icon: User,          label: 'Profile',     emoji: '👤' },
];

const SECONDARY_NAV = [
  { path: '/upgrade',    icon: Star,     label: 'Upgrade to Pro', emoji: '⭐', highlight: true },
  { path: '/settings',   icon: Settings, label: 'Settings',       emoji: '⚙️' },
  { path: '__signout',   icon: LogOut,   label: 'Sign Out',       emoji: '🚪', danger: true },
];

export default function SideDrawer({ open, onClose, onOpenMessages, user, profile, unreadMsgCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetTab } = useTabReset();

  const avatarUrl = profile?.avatar_url || user?.profile_picture;

  const handleNav = (path) => {
    onClose();
    if (path === '__messages') {
      onOpenMessages();
      return;
    }
    if (path === '__signout') {
      base44.auth.logout();
      return;
    }
    if (location.pathname === path) {
      resetTab(path);
    } else {
      navigate(path);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '80%',
              maxWidth: 320,
              zIndex: 201,
              background: 'hsl(var(--background))',
              borderLeft: '1px solid hsl(var(--border))',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Safe area top padding */}
            <div style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}>
              {/* Header */}
              <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'hsl(var(--secondary))',
                      border: '2px solid hsl(var(--border))',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                        {(profile?.display_name || user?.full_name || '?')[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1.2 }}>
                      {profile?.display_name || user?.full_name || 'Guest'}
                    </div>
                    {profile?.username && (
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                        @{profile.username}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'hsl(var(--secondary))',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <X size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                </button>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'hsl(var(--border))', margin: '0 20px 12px' }} />
            </div>

            {/* Scrollable nav */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
              {/* Main nav */}
              <div style={{ marginBottom: 8 }}>
                {MAIN_NAV.map((item) => {
                  const isActive = item.path !== '__messages' && location.pathname === item.path;
                  const hasUnread = item.path === '__messages' && unreadMsgCount > 0;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        width: '100%',
                        padding: '13px 12px',
                        borderRadius: 12,
                        border: 'none',
                        background: isActive ? 'hsl(var(--primary) / 0.12)' : 'transparent',
                        cursor: 'pointer',
                        marginBottom: 2,
                        position: 'relative',
                      }}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 3,
                          height: 22,
                          borderRadius: 2,
                          background: 'hsl(var(--primary))',
                        }} />
                      )}

                      {/* Icon container */}
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative',
                      }}>
                        <item.icon
                          size={17}
                          style={{ color: isActive ? '#fff' : 'hsl(var(--foreground) / 0.65)' }}
                        />
                        {hasUnread && (
                          <div style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: 'hsl(var(--primary))',
                            border: '2px solid hsl(var(--background))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 9,
                            fontWeight: 700,
                            color: '#fff',
                          }}>
                            {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                          </div>
                        )}
                      </div>

                      <span style={{
                        fontSize: 15,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                        flex: 1,
                        textAlign: 'left',
                      }}>
                        {item.label}
                      </span>

                      {isActive && (
                        <ChevronRight size={14} style={{ color: 'hsl(var(--primary) / 0.6)' }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'hsl(var(--border))', margin: '8px 0 16px' }} />

              {/* Secondary nav */}
              <div style={{ marginBottom: 24 }}>
                {SECONDARY_NAV.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      padding: '13px 12px',
                      borderRadius: 12,
                      border: 'none',
                      background: item.highlight ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                      cursor: 'pointer',
                      marginBottom: 2,
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: item.highlight
                        ? 'hsl(var(--primary) / 0.15)'
                        : item.danger
                        ? 'hsl(var(--destructive) / 0.1)'
                        : 'hsl(var(--secondary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <item.icon
                        size={17}
                        style={{
                          color: item.highlight
                            ? 'hsl(var(--primary))'
                            : item.danger
                            ? 'hsl(var(--destructive))'
                            : 'hsl(var(--foreground) / 0.65)',
                        }}
                      />
                    </div>
                    <span style={{
                      fontSize: 15,
                      fontWeight: item.highlight ? 700 : 500,
                      color: item.highlight
                        ? 'hsl(var(--primary))'
                        : item.danger
                        ? 'hsl(var(--destructive))'
                        : 'hsl(var(--foreground))',
                      flex: 1,
                      textAlign: 'left',
                    }}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Safe area bottom */}
            <div style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}