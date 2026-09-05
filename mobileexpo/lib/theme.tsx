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
  background: '#F1F5F9',
  foreground: '#0F172A',
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  primary: '#1E3A8A',
  primaryForeground: '#FFFFFF',
  secondary: '#E2E8F0',
  secondaryForeground: '#1E3A8A',
  muted: '#F8FAFC',
  mutedForeground: '#64748B',
  accent: '#2563EB',
  accentForeground: '#FFFFFF',
  border: '#E2E8F0',
  input: '#E2E8F0',
  ring: '#1E3A8A',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  sidebar: '#1E3A8A',
  sidebarForeground: '#F1F5F9',
  sidebarPrimary: '#2563EB',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#1D4ED8',
  sidebarAccentForeground: '#F1F5F9',
  sidebarBorder: '#1E40AF',
  success: '#10B981',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  info: '#3B82F6',
  infoForeground: '#FFFFFF',
};

const darkColors = {
  background: '#0B1220',
  foreground: '#F8FAFC',
  card: '#111827',
  cardForeground: '#F8FAFC',
  primary: '#1E3A8A',
  primaryForeground: '#FFFFFF',
  secondary: '#1E293B',
  secondaryForeground: '#F8FAFC',
  muted: '#1E293B',
  mutedForeground: '#94A3B8',
  accent: '#2563EB',
  accentForeground: '#FFFFFF',
  border: '#1F2937',
  input: '#1F2937',
  ring: '#60A5FA',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  sidebar: '#0B1220',
  sidebarForeground: '#F8FAFC',
  sidebarPrimary: '#2563EB',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#1E3A8A',
  sidebarAccentForeground: '#F8FAFC',
  sidebarBorder: '#1E40AF',
  success: '#10B981',
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
