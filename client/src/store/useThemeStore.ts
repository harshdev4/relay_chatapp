// =============================================================================
// Theme Store (Zustand + localStorage persistence)
// =============================================================================
import { create } from 'zustand';

export type ThemePalette = 'indigo' | 'sunset' | 'forest';
export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  palette: ThemePalette;
  mode: ThemeMode;
  setPalette: (palette: ThemePalette) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

// Read initial values from localStorage
function getInitialPalette(): ThemePalette {
  const stored = localStorage.getItem('relay-theme-palette');
  if (stored === 'indigo' || stored === 'sunset' || stored === 'forest') {
    return stored;
  }
  return 'indigo';
}

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem('relay-theme-mode');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  // Default to dark
  return 'dark';
}

function applyTheme(palette: ThemePalette, mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', `${palette}-${mode}`);
  localStorage.setItem('relay-theme-palette', palette);
  localStorage.setItem('relay-theme-mode', mode);
}

// Apply initial theme immediately
applyTheme(getInitialPalette(), getInitialMode());

export const useThemeStore = create<ThemeState>((set) => ({
  palette: getInitialPalette(),
  mode: getInitialMode(),

  setPalette: (palette) => {
    set((state) => {
      applyTheme(palette, state.mode);
      return { palette };
    });
  },

  setMode: (mode) => {
    set((state) => {
      applyTheme(state.palette, mode);
      return { mode };
    });
  },

  toggleMode: () => {
    set((state) => {
      const newMode = state.mode === 'dark' ? 'light' : 'dark';
      applyTheme(state.palette, newMode);
      return { mode: newMode };
    });
  },
}));
