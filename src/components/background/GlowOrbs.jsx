import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

const ORBS = [
  { color: 'hsl(160, 84%, 39%)', size: 450, delay: 0 },
  { color: 'hsl(200, 80%, 55%)', size: 400, delay: 0.5 },
  { color: 'hsl(280, 65%, 65%)', size: 430, delay: 1 },
  { color: 'hsl(40, 90%, 60%)', size: 380, delay: 1.5 },
  { color: 'hsl(340, 75%, 60%)', size: 420, delay: 2 },
];

function randomPos() {
  return {
    x: `${Math.random() * 80}vw`,
    y: `${Math.random() * 80}vh`,
  };
}

function useReducedMotion() {
  const mql = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  return mql ? mql.matches : false;
}

function Orb({ color, size }) {
  const controls = useAnimation();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return; // Don't animate when user prefers reduced motion

    let cancelled = false;

    async function loop() {
      while (!cancelled) {
        const { x, y } = randomPos();
        await controls.start({
          x,
          y,
          transition: {
            duration: 4 + Math.random() * 6,
            ease: 'easeInOut',
          },
        });
      }
    }

    const start = randomPos();
    controls.set({ x: start.x, y: start.y });
    loop();

    return () => { cancelled = true; };
  }, [controls, reducedMotion]);

  return (
    <motion.div
      animate={controls}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `min(${size}px, 55vw)`,
        height: `min(${size}px, 55vw)`,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: reducedMotion ? 0.25 : 0.55,
        filter: 'blur(25px)',
        mixBlendMode: 'screen',
        willChange: reducedMotion ? 'auto' : 'transform',
        pointerEvents: 'none',
      }}
    />
  );
}

export default function GlowOrbs() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ transform: 'translateZ(0)' }}
    >
      {ORBS.map((orb, i) => (
        <Orb key={i} {...orb} />
      ))}
    </div>
  );
}