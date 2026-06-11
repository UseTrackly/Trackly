import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 70;

/**
 * Pass scrollContainerRef pointing to the scrollable element (not window).
 * Falls back to window.scrollY if no ref provided.
 */
export default function usePullToRefresh(onRefresh, scrollContainerRef) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);

  const getScrollTop = useCallback(() => {
    if (scrollContainerRef?.current) return scrollContainerRef.current.scrollTop;
    return window.scrollY;
  }, [scrollContainerRef]);

  const onTouchStart = useCallback((e) => {
    if (getScrollTop() === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [getScrollTop]);

  const onTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(0);
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    } else {
      setPullDistance(0);
    }
    startY.current = null;
  }, [pullDistance, onRefresh]);

  return { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd };
}