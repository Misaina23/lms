import { useState, useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  YStack,
  XStack,
  Card,
  Text,
  SizableText,
  H2,
  H3,
  Paragraph,
  Home as HomeIcon,
  ClipboardCheck,
  CalendarDays,
  MessageCircle,
  UserRound,
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock3,
  UsersRound,
  Search,
  GraduationCap,
  BookOpen,
  Building2,
  CircleDollarSign,
  ArrowUpRight,
  Menu,
  Sun,
  Moon,
  X,
  LogOut,
  Settings2 as SettingsIcon,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import * as Haptics from 'expo-haptics';
import { spacing, fontSize, iconSize, SCREEN_WIDTH } from '@/lib/responsive';
import { BottomNav, type TabItem } from '@/components/BottomNav';
import { TopBar } from '@/components/TopBar';
import { Drawer } from '@/components/Drawer';
import { PrimaryButton } from '@/components/PrimaryButton';

import DashboardScreen from '@/app/screens/DashboardScreen';
import ScheduleScreen from '@/app/screens/ScheduleScreen';
import AttendanceScreen from '@/app/screens/AttendanceScreen';
import GradesScreen from '@/app/screens/GradesScreen';
import ChatScreen from '@/app/screens/ChatScreen';
import NotificationsScreen from '@/app/screens/NotificationsScreen';
import SettingsScreen from '@/app/screens/SettingsScreen';

function tapFeedback() {
  if (Platform.OS !== 'web') {
    try { Haptics.selectionAsync(); } catch {}
  }
}

type TabKey = 'Accueil' | 'Planning' | 'Pointage' | 'Notes' | 'Messages' | 'Notifications' | 'Paramètres';

const BOTTOM_TABS: TabItem<TabKey>[] = [
  {
    key: 'Accueil',
    label: 'Accueil',
    icon: ({ color, size }) => <HomeIcon size={size} color={color} />,
  },
  {
    key: 'Planning',
    label: 'Planning',
    icon: ({ color, size }) => <CalendarDays size={size} color={color} />,
  },
  {
    key: 'Pointage',
    label: 'Pointage',
    icon: ({ color, size }) => <CheckCircle2 size={size} color={color} />,
  },
  {
    key: 'Notes',
    label: 'Notes',
    icon: ({ color, size }) => <ClipboardCheck size={size} color={color} />,
  },
  {
    key: 'Messages',
    label: 'Messages',
    icon: ({ color, size }) => <MessageCircle size={size} color={color} />,
  },
];

const ALL_TABS: TabItem<TabKey>[] = [
  ...BOTTOM_TABS,
  {
    key: 'Notifications',
    label: 'Notifications',
    icon: ({ color, size }) => <Bell size={size} color={color} />,
  },
  {
    key: 'Paramètres',
    label: 'Paramètres',
    icon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
  },
];

const TAB_TITLES: Record<TabKey, { title: string; subtitle?: string }> = {
  'Accueil': { title: 'Tableau de bord', subtitle: 'Aperçu rapide' },
  'Planning': { title: 'Emploi du temps', subtitle: 'Vos cours' },
  'Pointage': { title: 'Pointage', subtitle: 'Présences & retards' },
  'Notes': { title: 'Saisie des notes', subtitle: 'Évaluations' },
  'Messages': { title: 'Messages', subtitle: 'Échanges & groupes' },
  'Notifications': { title: 'Notifications', subtitle: 'Alertes & annonces' },
  'Paramètres': { title: 'Paramètres', subtitle: 'Profil & préférences' },
};

function LoadingScreen({ message = 'Chargement...' }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <YStack flex={1} backgroundColor={colors.background} justifyContent="center" alignItems="center" gap={spacing.md}>
      <ActivityIndicator size="large" color={colors.accent} />
      <SizableText color={colors.mutedForeground} size={fontSize.md}>{message}</SizableText>
    </YStack>
  );
}

function LoginScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <YStack
      flex={1}
      backgroundColor={colors.background}
      justifyContent="center"
      alignItems="center"
      paddingHorizontal={spacing.xl}
      gap={spacing.lg}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <SizableText color={colors.primaryForeground} fontWeight="800" size={28}>LH</SizableText>
      </View>
      <YStack gap={spacing.xs} alignItems="center">
        <SizableText color={colors.foreground} fontWeight="800" size={fontSize.xxl} textAlign="center">
          Lycée Horizon
        </SizableText>
        <SizableText color={colors.mutedForeground} size={fontSize.sm} textAlign="center">
          Espace enseignant · Pointage, notes, messagerie
        </SizableText>
      </YStack>
      <YStack width="100%" maxWidth={360} gap={spacing.md} marginTop={spacing.lg}>
        <PrimaryButton
          label="Se connecter"
          onPress={() => navigation.navigate('login' as never)}
          fullWidth
          size="lg"
        />
        <SizableText color={colors.mutedForeground} size={fontSize.xs} textAlign="center">
          Lycée Horizon · Développé par DevMisaina
        </SizableText>
      </YStack>
    </YStack>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('Accueil');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { colors, toggleTheme, isDark, mode } = useTheme();
  const { user, isAuthenticated, loading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const renderContent = () => {
    if (!user) return <LoadingScreen />;

    switch (activeTab) {
      case 'Accueil':
        return <DashboardScreen onNavigate={(tab: string) => setActiveTab(tab as TabKey)} />;
      case 'Planning':
        return <ScheduleScreen />;
      case 'Pointage':
        return <AttendanceScreen />;
      case 'Notes':
        return <GradesScreen />;
      case 'Messages':
        return <ChatScreen />;
      case 'Notifications':
        return <NotificationsScreen />;
      case 'Paramètres':
        return <SettingsScreen />;
      default:
        return <DashboardScreen onNavigate={(tab: string) => setActiveTab(tab as TabKey)} />;
    }
  };

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginScreen />;

  const tabInfo = TAB_TITLES[activeTab];
  const userInitials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '?';

  return (
    <YStack flex={1} backgroundColor={colors.background}>
      <TopBar
        title={tabInfo.title}
        subtitle={tabInfo.subtitle}
        leftIcon={<Menu size={20} color={colors.foreground} />}
        onLeftPress={() => {
          tapFeedback();
          setDrawerOpen(true);
        }}
        rightIcons={[
          <View
            key="bell"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.secondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={18} color={colors.foreground} />
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.destructive,
              }}
            />
          </View>,
          <View
            key="avatar"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SizableText color={colors.primaryForeground} fontWeight="800" size={13}>
              {userInitials}
            </SizableText>
          </View>,
        ]}
      />

      <YStack flex={1}>
        {renderContent()}
      </YStack>

      <BottomNav
        tabs={BOTTOM_TABS}
        activeKey={activeTab}
        onChange={(key) => {
          tapFeedback();
          setActiveTab(key);
        }}
      />

      <Drawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tabs={ALL_TABS}
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key)}
        user={user}
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />
    </YStack>
  );
}
