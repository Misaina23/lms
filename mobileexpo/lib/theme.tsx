import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    ring: string;
    destructive: string;
    destructiveForeground: string;
    sidebar: string;
    sidebarForeground: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    info: string;
    infoForeground: string;
  };
}

const lightColors = {
  background: '#0A0F1E',
  foreground: '#F1F4FB',
  card: '#131C36',
  cardForeground: '#F1F4FB',
  primary: '#2F6BFF',
  primaryForeground: '#FFFFFF',
  secondary: '#0F1730',
  secondaryForeground: '#F1F4FB',
  muted: '#8A93AC',
  mutedForeground: '#8A93AC',
  accent: '#38D4FF',
  accentForeground: '#0A0F1E',
  border: 'rgba(255,255,255,0.08)',
  input: '#131C36',
  ring: '#2F6BFF',
  destructive: '#F04438',
  destructiveForeground: '#FFFFFF',
  sidebar: '#0A0F1E',
  sidebarForeground: '#F1F4FB',
  sidebarPrimary: '#2F6BFF',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#0F1730',
  sidebarAccentForeground: '#F1F4FB',
  sidebarBorder: 'rgba(255,255,255,0.08)',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F5A524',
  warningForeground: '#FFFFFF',
  info: '#38D4FF',
  infoForeground: '#0A0F1E',
};

const darkColors = {
  background: '#0A0F1E',
  foreground: '#F1F4FB',
  card: '#131C36',
  cardForeground: '#F1F4FB',
  primary: '#2F6BFF',
  primaryForeground: '#FFFFFF',
  secondary: '#0F1730',
  secondaryForeground: '#F1F4FB',
  muted: '#8A93AC',
  mutedForeground: '#8A93AC',
  accent: '#38D4FF',
  accentForeground: '#0A0F1E',
  border: 'rgba(255,255,255,0.08)',
  input: '#131C36',
  ring: '#4E8CFF',
  destructive: '#F04438',
  destructiveForeground: '#FFFFFF',
  sidebar: '#0A0F1E',
  sidebarForeground: '#F1F4FB',
  sidebarPrimary: '#2F6BFF',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#0F1730',
  sidebarAccentForeground: '#F1F4FB',
  sidebarBorder: 'rgba(255,255,255,0.08)',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F5A524',
  warningForeground: '#FFFFFF',
  info: '#38D4FF',
  infoForeground: '#0A0F1E',
};

interface ThemeContextValue extends Theme {
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  const systemColorScheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem('theme').then((saved) => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('theme', newMode);
  };

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';

  const theme = useMemo<Theme>(() => ({
    mode,
    isDark,
    colors: isDark ? darkColors : lightColors,
  }), [mode, isDark]);

  const toggleTheme = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ ...theme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
