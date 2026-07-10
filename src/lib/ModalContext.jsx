import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Global Modal Manager
 *
 * Ensures only ONE modal/sheet/menu can be open at a time across the entire app.
 * Opening a new modal automatically closes any previously open one.
 *
 * Usage:
 *   const { isOpen, open, close, closeAll } = useModal();
 *   <Sheet open={isOpen('my-modal')} onOpenChange={(v) => v ? open('my-modal') : close('my-modal')}>
 */
const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  // Single active modal key. null = nothing open.
  const [activeModal, setActiveModal] = useState(null);

  // Opening a new modal replaces the active one — previous modal closes automatically.
  const open = useCallback((key) => {
    setActiveModal(key);
  }, []);

  // Close a specific modal (only if it's the active one).
  const close = useCallback((key) => {
    setActiveModal((prev) => (prev === key ? null : prev));
  }, []);

  // Close whatever is open.
  const closeAll = useCallback(() => {
    setActiveModal(null);
  }, []);

  // Check if a specific modal key is the active one.
  const isOpen = useCallback((key) => activeModal === key, [activeModal]);

  return (
    <ModalContext.Provider value={{ activeModal, open, close, closeAll, isOpen }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}