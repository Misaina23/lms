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
  background: '#F8FAF9',
  foreground: '#0F1F1D',
  card: '#FFFFFF',
  cardForeground: '#0F1F1D',
  primary: '#1A3A36',
  primaryForeground: '#F8FAF9',
  secondary: '#E8F0EC',
  secondaryForeground: '#1A3A36',
  muted: '#F0F4F2',
  mutedForeground: '#5F726D',
  accent: '#2B6F68',
  accentForeground: '#FFFFFF',
  border: '#E0E8E4',
  input: '#E0E8E4',
  ring: '#1A3A36',
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
  sidebar: '#1A3A36',
  sidebarForeground: '#E8F0EC',
  sidebarPrimary: '#2B6F68',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#143432',
  sidebarAccentForeground: '#E8F0EC',
  sidebarBorder: '#2A4A46',
  success: '#16A34A',
  successForeground: '#FFFFFF',
  warning: '#D97706',
  warningForeground: '#FFFFFF',
  info: '#2563EB',
  infoForeground: '#FFFFFF',
};

const darkColors = {
  background: '#0F1F1D',
  foreground: '#E8F0EC',
  card: '#1A3A36',
  cardForeground: '#E8F0EC',
  primary: '#E8F0EC',
  primaryForeground: '#0F1F1D',
  secondary: '#2A4A46',
  secondaryForeground: '#E8F0EC',
  muted: '#2A4A46',
  mutedForeground: '#9CB3AD',
  accent: '#2B6F68',
  accentForeground: '#FFFFFF',
  border: '#2A4A46',
  input: '#2A4A46',
  ring: '#E8F0EC',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  sidebar: '#0A1614',
  sidebarForeground: '#E8F0EC',
  sidebarPrimary: '#2B6F68',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#143432',
  sidebarAccentForeground: '#E8F0EC',
  sidebarBorder: '#2A4A46',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  info: '#3B82F6',
  infoForeground: '#FFFFFF',
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
