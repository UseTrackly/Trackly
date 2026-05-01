import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, Eye, ChevronRight } from 'lucide-react';

const slides = [
  {
    icon: Eye,
    title: "See Your Real Margins",
    description: "Most resellers lose 15–22% to fees they never see. Trackly shows you every hidden cost across every platform.",
    accent: "Stop guessing. Start knowing.",
  },
  {
    icon: Calculator,
    title: "Calculate in Seconds",
    description: "Enter buy price, sale price, and platform. We auto-calculate every fee, processing charge, and your true net profit.",
    accent: "Pre-loaded fees for eBay, StockX, GOAT, Poshmark, and more.",
  },
  {
    icon: TrendingUp,
    title: "Track Every Flip",
    description: "Log your flips, see your ROI over time, find your best platforms, and export reports. Built for serious resellers.",
    accent: "Your profit dashboard. Always in your pocket.",
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      localStorage.setItem('trackly-onboarded', 'true');
      navigate('/onboarding-categories');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('trackly-onboarded', 'true');
    navigate('/onboarding-categories');
  };

  const slide = slides[current];

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8">
      {/* Skip */}
      <div className="flex justify-end">
      <button
        onClick={handleSkip}
        aria-label="Skip onboarding"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
      >
        Skip
      </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <img 
          src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png" 
          alt="Trackly" 
          className="h-16 mx-auto mb-12"
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="mx-auto mb-8 p-5 rounded-2xl bg-primary/10 w-fit">
              <slide.icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              {slide.title}
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto mb-4">
              {slide.description}
            </p>
            <p className="text-sm text-primary font-medium">
              {slide.accent}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots & Button */}
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Onboarding progress">
          {slides.map((_, i) => (
            <div
              key={i}
              role="tab"
              aria-label={`Step ${i + 1} of ${slides.length}`}
              aria-selected={i === current}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-primary' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
        <Button
          onClick={handleNext}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl"
        >
          {current < slides.length - 1 ? (
            <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>
          ) : (
            <>Get Started <ChevronRight className="w-4 h-4 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}