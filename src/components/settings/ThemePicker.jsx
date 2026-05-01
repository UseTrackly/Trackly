import React from 'react';
import { motion } from 'framer-motion';
import { COLOR_THEMES } from '@/lib/colorThemes';
import { useTheme } from '@/lib/ThemeContext';

export default function ThemePicker() {
  const { colorTheme, changeColorTheme } = useTheme();

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Color Themes
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(COLOR_THEMES).map(([key, theme]) => (
          <motion.button
            key={key}
            onClick={() => changeColorTheme(key)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              colorTheme === key
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{theme.icon}</span>
              <span className="font-semibold text-sm">{theme.name}</span>
            </div>
            {/* Color preview dots */}
            <div className="flex gap-1.5">
              {['primary', 'accent'].map((colorKey) => (
                <div
                  key={colorKey}
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: `hsl(${theme.colors[colorKey]})`
                  }}
                />
              ))}
            </div>
            {colorTheme === key && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}