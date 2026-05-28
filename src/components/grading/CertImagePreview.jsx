import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shown inside the graded card section.
 * When certNumber is long enough + user stops typing, it auto-fetches the card image.
 * Calls onImageFound(url, cardName) when the user accepts the image.
 */
export default function CertImagePreview({ certNumber, gradingCompany, onImageFound, currentImageUrl }) {
  const [status, setStatus] = useState('idle'); // idle | loading | found | not_found | dismissed
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cardName, setCardName] = useState(null);
  const timerRef = useRef(null);
  const lastLookedUp = useRef('');

  useEffect(() => {
    // Reset if cert cleared
    if (!certNumber || certNumber.trim().length < 5) {
      setStatus('idle');
      setPreviewUrl(null);
      setCardName(null);
      lastLookedUp.current = '';
      return;
    }

    // Don't re-fetch same cert
    if (certNumber.trim() === lastLookedUp.current) return;

    // Debounce 1.5s after user stops typing
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const cert = certNumber.trim();
      lastLookedUp.current = cert;
      setStatus('loading');
      setPreviewUrl(null);
      setCardName(null);

      try {
        const res = await base44.functions.invoke('lookupGradedCard', {
          cert_number: cert,
          grading_company: gradingCompany,
        });
        const { image_url, card_name } = res.data || {};
        if (image_url) {
          setPreviewUrl(image_url);
          setCardName(card_name || null);
          setStatus('found');
        } else {
          setStatus('not_found');
        }
      } catch {
        setStatus('not_found');
      }
    }, 1500);

    return () => clearTimeout(timerRef.current);
  }, [certNumber, gradingCompany]);

  // Reset dismissed state if cert changes
  useEffect(() => {
    setStatus(prev => prev === 'dismissed' ? 'idle' : prev);
  }, [certNumber]);

  if (status === 'idle') return null;

  return (
    <AnimatePresence>
      {status === 'loading' && (
        <motion.div
          key="loading"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20"
        >
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
          <span className="text-xs text-muted-foreground">Looking up card image from {gradingCompany}...</span>
        </motion.div>
      )}

      {status === 'found' && (
        <motion.div
          key="found"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary flex-1">Card image found!</span>
            <button onClick={() => setStatus('dismissed')} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 flex items-center gap-3">
            <img
              src={previewUrl}
              alt={cardName || 'Graded card'}
              className="w-16 h-20 object-contain rounded-lg bg-background border border-border"
              onError={() => setStatus('not_found')}
            />
            <div className="flex-1 min-w-0">
              {cardName && (
                <p className="text-xs font-medium text-foreground truncate mb-1">{cardName}</p>
              )}
              <p className="text-[10px] text-muted-foreground mb-3">
                Use this image instead of uploading a photo?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onImageFound(previewUrl, cardName);
                    setStatus('dismissed');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                >
                  <Check className="w-3 h-3" />
                  Use This
                </button>
                <button
                  onClick={() => setStatus('dismissed')}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                >
                  No Thanks
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {status === 'not_found' && (
        <motion.div
          key="not_found"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border"
        >
          <span className="text-xs text-muted-foreground">No image found for this cert — upload one manually.</span>
          <button onClick={() => setStatus('dismissed')} className="text-muted-foreground hover:text-foreground ml-2">
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}