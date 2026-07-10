import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * iOS-safe inline action menu — no Radix, no focus traps, no scroll locks.
 * Renders a transparent full-screen backdrop + menu panel via portal to body.
 * Uses pointerdown (works on iOS touch) for both open and outside-click-close.
 */
export default function ActionMenu({ trigger, items, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleTrigger = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192; // w-48
    let left;
    if (align === 'end') {
      left = rect.right - menuWidth;
    } else {
      left = rect.left;
    }
    // Keep on screen
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    setPos({ top: rect.bottom + 4, left });
    setOpen(v => !v);
  }, [align]);

  // Close on outside pointerdown
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      const target = e.target;
      if (target?.closest?.('[data-action-menu-content]')) return;
      if (target?.closest?.('[data-action-menu-trigger]')) return;
      setOpen(false);
    };
    // Delay to avoid the same pointerdown that opened it
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handle, true);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handle, true);
    };
  }, [open]);

  // Clone trigger to inject onClick
  const triggerEl = React.cloneElement(trigger, {
    onClick: handleTrigger,
    'data-action-menu-trigger': true,
  });

  return (
    <>
      <span
        ref={triggerRef}
        data-action-menu-trigger
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'inline-flex' }}
      >
        {triggerEl}
      </span>
      {open && createPortal(
        <>
          {/* Transparent backdrop — catches outside taps */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
            onPointerDown={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          {/* Menu panel */}
          <div
            data-action-menu-content
            className="min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 99999,
              width: 192,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick?.();
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                  item.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}