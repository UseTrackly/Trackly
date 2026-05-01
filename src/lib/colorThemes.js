// Comprehensive color theme presets for the app
export const COLOR_THEMES = {
  default: {
    name: 'Default',
    icon: '🎨',
    colors: {
      primary: '160 84% 39%',
      secondary: '0 0% 12%',
      accent: '160 84% 39%',
      background: '0 0% 4%',
      card: '0 0% 7%',
      foreground: '0 0% 95%',
      border: '0 0% 14%',
    }
  },
  ocean: {
    name: 'Ocean',
    icon: '🌊',
    colors: {
      primary: '210 100% 50%',
      secondary: '200 20% 20%',
      accent: '180 100% 40%',
      background: '210 20% 8%',
      card: '210 20% 12%',
      foreground: '0 0% 95%',
      border: '210 30% 18%',
    }
  },
  sunset: {
    name: 'Sunset',
    icon: '🌅',
    colors: {
      primary: '20 100% 55%',
      secondary: '10 80% 30%',
      accent: '40 100% 50%',
      background: '20 40% 10%',
      card: '15 60% 15%',
      foreground: '0 0% 95%',
      border: '20 50% 20%',
    }
  },
  forest: {
    name: 'Forest',
    icon: '🌲',
    colors: {
      primary: '120 60% 45%',
      secondary: '100 40% 25%',
      accent: '140 80% 50%',
      background: '120 30% 8%',
      card: '110 35% 12%',
      foreground: '0 0% 95%',
      border: '120 40% 18%',
    }
  },
  neon: {
    name: 'Neon',
    icon: '⚡',
    colors: {
      primary: '280 100% 60%',
      secondary: '300 100% 20%',
      accent: '0 100% 60%',
      background: '270 100% 5%',
      card: '280 100% 10%',
      foreground: '0 0% 100%',
      border: '280 100% 25%',
    }
  },
  rose: {
    name: 'Rose',
    icon: '🌹',
    colors: {
      primary: '340 85% 55%',
      secondary: '330 50% 30%',
      accent: '350 100% 45%',
      background: '340 40% 10%',
      card: '330 50% 15%',
      foreground: '0 0% 95%',
      border: '340 50% 22%',
    }
  },
  midnight: {
    name: 'Midnight',
    icon: '🌙',
    colors: {
      primary: '250 100% 55%',
      secondary: '240 20% 15%',
      accent: '260 100% 60%',
      background: '240 20% 5%',
      card: '240 20% 8%',
      foreground: '0 0% 100%',
      border: '240 30% 15%',
    }
  },
  gold: {
    name: 'Gold',
    icon: '👑',
    colors: {
      primary: '45 100% 50%',
      secondary: '35 80% 30%',
      accent: '50 100% 55%',
      background: '40 50% 8%',
      card: '35 60% 12%',
      foreground: '0 0% 95%',
      border: '40 60% 20%',
    }
  },
};

export function applyColorTheme(themeName) {
  const theme = COLOR_THEMES[themeName];
  if (!theme) return;

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
}

export function getThemeByName(themeName) {
  return COLOR_THEMES[themeName];
}