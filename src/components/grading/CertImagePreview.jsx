import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, X, Check, Upload, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shown inside the graded card section.
 * When certNumber is long enough + user stops typing, auto-fetches card data
 * from the grading company's cert lookup.
 *
 * Props:
 * - certNumber: string
 * - gradingCompany: string (PSA, BGS, SGC, CGC, etc.)
 * - onImageFound(url, cardName): called when user accepts a fetched image
 * - onCardInfoFound({ card_name, grade, year, set_name }): called to pre-fill form fields
 * - currentImageUrl: existing image (editing mode)
 * - onManualUpload(): called when user wants to upload manually
 */
export default function CertImagePreview({
  certNumber,
  gradingCompany,
  onImageFound,
  onCardInfoFound,
  currentImageUrl,
  onManualUpload,
}) {
  const [status, setStatus] = useState('idle'); // idle | loading | found | not_found | dismissed
  const [cardData, setCardData] = useState(null);
  const [selectedImage, setSelectedImage] = useState('front'); // 'front' | 'back'
  const timerRef = useRef(null);
  const lastLookedUp = useRef('');

  useEffect(() => {
    if (!certNumber || certNumber.trim().length < 5) {
      setStatus('idle');
      setCardData(null);
      lastLookedUp.current = '';
      return;
    }

    const key = `${gradingCompany}:${certNumber.trim()}`;
    if (key === lastLookedUp.current) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      lastLookedUp.current = key;
      setStatus('loading');
      setCardData(null);

      try {
        const res = await base44.functions.invoke('lookupGradedCard', {
          cert_number: certNumber.trim(),
          grading_company: gradingCompany,
        });
        const data = res.data || {};

        if (!data.found) {
          setStatus('not_found');
          return;
        }

        setCardData(data);
        setSelectedImage('front');
        setStatus('found');

        // Pre-fill card name and grade in the parent form if available
        if (onCardInfoFound) {
          onCardInfoFound({
            card_name: data.card_name,
            grade: data.grade,
            year: data.year,
            set_name: data.set_name,
          });
        }
      } catch {
        setStatus('not_found');
      }
    }, 1500);

    return () => clearTimeout(timerRef.current);
  }, [certNumber, gradingCompany]);

  // Reset dismissed state when cert changes
  useEffect(() => {
    setStatus(prev => prev === 'dismissed' ? 'idle' : prev);
  }, [certNumber]);

  if (status === 'idle') return null;

  const activeImageUrl = selectedImage === 'back' ? cardData?.back_image_url : cardData?.front_image_url;
  const hasImages = !!(cardData?.front_image_url || cardData?.back_image_url);

  return (
    <AnimatePresence mode="wait">
      {status === 'loading' && (
        <motion.div
          key="loading"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20"
        >
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
          <span className="text-xs text-muted-foreground">
            Looking up cert {certNumber} on {gradingCompany}…
          </span>
        </motion.div>
      )}

      {status === 'found' && cardData && (
        <motion.div
          key="found"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-primary flex-1">
              {gradingCompany} Cert Found
            </span>
            <button
              onClick={() => setStatus('dismissed')}
              className="text-muted-foreground hover:text-foreground"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Card details */}
            <div className="space-y-0.5">
              {cardData.card_name && (
                <p className="text-sm font-semibold text-foreground leading-snug">{cardData.card_name}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {cardData.grade && (
                  <span className="text-xs text-muted-foreground">
                    Grade: <span className="font-semibold text-foreground">{cardData.grade}</span>
                  </span>
                )}
                {cardData.year && (
                  <span className="text-xs text-muted-foreground">Year: <span className="font-medium text-foreground">{cardData.year}</span></span>
                )}
                {cardData.set_name && (
                  <span className="text-xs text-muted-foreground">Set: <span className="font-medium text-foreground">{cardData.set_name}</span></span>
                )}
                {cardData.card_number && (
                  <span className="text-xs text-muted-foreground">#{cardData.card_number}</span>
                )}
              </div>
            </div>

            {/* Image section */}
            {hasImages ? (
              <div className="space-y-2">
                {/* Front/Back toggle if both available */}
                {cardData.front_image_url && cardData.back_image_url && (
                  <div className="flex gap-1">
                    {['front', 'back'].map(side => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setSelectedImage(side)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize ${
                          selectedImage === side
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {side}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {activeImageUrl && (
                    <img
                      src={activeImageUrl}
                      alt={cardData.card_name || 'Graded card'}
                      className="w-16 h-20 object-contain rounded-lg bg-background border border-border shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      Use this image for your inventory?
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onImageFound(activeImageUrl, cardData.card_name);
                          setStatus('dismissed');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                      >
                        <Check className="w-3 h-3" />
                        Use This
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus('dismissed')}
                        className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Card found but no image available */
              <div className="space-y-2">
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50 border border-border">
                  <ImageOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {gradingCompany} doesn't provide images for this cert. Upload one manually.
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      // Pre-fill card name even without image
                      if (onCardInfoFound && cardData.card_name) {
                        onCardInfoFound({
                          card_name: cardData.card_name,
                          grade: cardData.grade,
                          year: cardData.year,
                          set_name: cardData.set_name,
                        });
                      }
                      setStatus('dismissed');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                  >
                    <Check className="w-3 h-3" />
                    Use Card Info
                  </button>
                  {onManualUpload && (
                    <button
                      type="button"
                      onClick={() => { onManualUpload(); setStatus('dismissed'); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                    >
                      <Upload className="w-3 h-3" />
                      Upload Photo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {status === 'not_found' && (
        <motion.div
          key="not_found"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/50 border border-border"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ImageOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              No cert found on {gradingCompany} for #{certNumber} — upload image manually.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatus('dismissed')}
            className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}