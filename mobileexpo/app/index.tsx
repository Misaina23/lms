import { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  YStack,
  XStack,
  ScrollView,
  Card,
  Button,
  Input,
  H1,
  H2,
  H3,
  Paragraph,
  SizableText,
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
  Wifi,
  Send,
  Search,
  MoreHorizontal,
  ShieldCheck,
  Settings2,
  GraduationCap,
  BookOpen,
  FileText,
  Building2,
  CircleDollarSign,
  Download,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X,
  ChevronDown,
  LogOut,
  BarChart2,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import * as Haptics from 'expo-haptics';

// Import screens
import { DashboardScreen } from '@/app/screens/DashboardScreen';
import { ScheduleScreen } from '@/app/screens/ScheduleScreen';
import { AttendanceScreen } from '@/app/screens/AttendanceScreen';
import { GradesScreen } from '@/app/screens/GradesScreen';
import { EnrollmentScreen } from '@/app/screens/EnrollmentScreen';
import { ChatScreen } from '@/app/screens/ChatScreen';
import { ReportsScreen } from '@/app/screens/ReportsScreen';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

type Tab = 'Accueil' | 'Mes classes' | 'Notes' | 'Pointage' | 'Emploi du temps' | 'Messages' | 'Profil' | 'Rapports' | 'Inscriptions';

const NAV_ITEMS: { label: Tab; icon: typeof HomeIcon; roles: string[] }[] = [
  { label: 'Accueil', icon: HomeIcon, roles: ['ADMIN', 'PROFESSEUR', 'SURVEILLANT'] },
  { label: 'Mes classes', icon: UsersRound, roles: ['ADMIN', 'PROFESSEUR', 'SURVEILLANT'] },
  { label: 'Notes', icon: ClipboardCheck, roles: ['ADMIN', 'PROFESSEUR'] },
  { label: 'Pointage', icon: CheckCircle2, roles: ['ADMIN', 'PROFESSEUR'] },
  { label: 'Emploi du temps', icon: CalendarDays, roles: ['ADMIN', 'PROFESSEUR', 'SURVEILLANT'] },
  { label: 'Messages', icon: MessageCircle, roles: ['ADMIN', 'PROFESSEUR', 'SURVEILLANT'] },
  { label: 'Rapports', icon: BarChart2, roles: ['ADMIN', 'PROFESSEUR', 'SURVEILLANT'] },
  { label: 'Inscriptions', icon: GraduationCap, roles: ['ADMIN', 'PROFESSEUR', 'SURVEILLANT'] },
];

function getNavItemsForRole(role: string | undefined) {
  return NAV_ITEMS.filter(item => item.roles.includes(role || ''));
}

function ProfileScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  if (!user) {
    return (
      <YStack flex={1} backgroundColor={colors.background} justifyContent="center" alignItems="center" padding="$6">
        <SizableText color={colors.mutedForeground}>Chargement...</SizableText>
      </YStack>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    PROFESSEUR: 'Professeur',
    ELEVE: 'Élève',
    PARENT: 'Parent',
    SURVEILLANT: 'Surveillant',
  };

  return (
    <ScrollView
      flex={1}
      backgroundColor={colors.background}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 24,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <YStack gap="$6" maxWidth={520} alignSelf="center" width="100%">
        {/* Header */}
        <YStack gap="$3" alignItems="center">
          <YStack
            width={80}
            height={80}
            borderRadius="$6"
            backgroundColor={colors.accent}
            alignItems="center"
            justifyContent="center"
          >
            <SizableText color={colors.accentForeground} size="$6" fontWeight="800">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </SizableText>
          </YStack>
          <YStack gap="$1" alignItems="center">
            <H2 color={colors.foreground} fontWeight="800" textAlign="center">
              {user.first_name} {user.last_name}
            </H2>
            <SizableText color={colors.mutedForeground} size="$3" textAlign="center">
              {roleLabels[user.role] || user.role}
            </SizableText>
            <SizableText color={colors.mutedForeground} size="$2" textAlign="center">
              {user.matricule}
            </SizableText>
          </YStack>
        </YStack>

        {/* Info Card */}
        <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$5" gap="$4">
          <H3 color={colors.foreground} fontWeight="700">Informations personnelles</H3>
          
          <YStack gap="$3">
            {[
              { label: 'Email', value: user.email },
              { label: 'Téléphone', value: user.phone || 'Non renseigné' },
              { label: 'Rôle', value: roleLabels[user.role] || user.role },
              ...(user.teacher_type ? [{ label: 'Type', value: user.teacher_type === 'FONCTIONNAIRE' ? 'Fonctionnaire' : 'Suppléant' }] : []),
              ...(user.surveillant_type ? [{ label: 'Type', value: user.surveillant_type }] : []),
              { label: 'Statut', value: user.status === 'ACTIVE' ? 'Actif' : user.status === 'PENDING_VERIFICATION' ? 'En attente' : user.status },
            ].map((item, i) => (
              <XStack key={i} justifyContent="space-between" alignItems="center" paddingVertical="$2" borderBottomColor={colors.border} borderBottomWidth={i < 5 ? 1 : 0}>
                <SizableText color={colors.mutedForeground} size="$3">{item.label}</SizableText>
                <SizableText color={colors.foreground} fontWeight="600" size="$3">{item.value}</SizableText>
              </XStack>
            ))}
          </YStack>
        </Card>

        {/* Actions */}
        <YStack gap="$3">
          <Button
            height={54}
            backgroundColor={colors.accent}
            color={colors.accentForeground}
            borderRadius="$5"
            onPress={() => {}}
          >
            <XStack gap="$2" alignItems="center">
              <Settings2 size={20} />
              <SizableText size="$3" fontWeight="700">Modifier mon profil</SizableText>
            </XStack>
          </Button>
          
          <Button
            height={54}
            backgroundColor={colors.destructive}
            color={colors.destructiveForeground}
            borderRadius="$5"
            onPress={handleLogout}
          >
            <XStack gap="$2" alignItems="center">
              <LogOut size={20} />
              <SizableText size="$3" fontWeight="700">Se déconnecter</SizableText>
            </XStack>
          </Button>
        </YStack>

        <SizableText color={colors.mutedForeground} size="$1" textAlign="center" marginTop="$2">
          Lycée Horizon · Développé par DevMisaina
        </SizableText>
      </YStack>
    </ScrollView>
  );
}

function PlaceholderScreen({ tab, role }: { tab: Tab; role?: string }) {
  const { colors } = useTheme();
  const isSurveillant = role === 'SURVEILLANT';
  
  const copy: Record<string, { title: string; subtitle: string; body: string; restricted?: boolean }> = {
    'Mes classes': {
      title: 'Mes classes',
      subtitle: 'Vos classes affectées',
      body: 'Retrouvez vos élèves et leurs informations scolaires autorisées.',
    },
    'Notes': {
      title: 'Notes',
      subtitle: 'Saisie des notes',
      body: isSurveillant ? 'Accès en lecture seule pour les surveillants.' : 'Saisissez et consultez les notes de vos classes.',
      restricted: isSurveillant,
    },
    'Pointage': {
      title: 'Pointage',
      subtitle: 'Présence du jour',
      body: isSurveillant ? 'Accès en lecture seule pour les surveillants.' : 'Enregistrez les présences et retards de vos classes.',
      restricted: isSurveillant,
    },
    'Emploi du temps': {
      title: 'Emploi du temps',
      subtitle: 'Planning de la semaine',
      body: 'Consultez votre emploi du temps et celui des autres enseignants.',
    },
    'Messages': {
      title: 'Messages',
      subtitle: 'Communication interne',
      body: 'Échangez avec vos collègues et participez aux discussions.',
    },
    'Rapports': {
      title: 'Rapports',
      subtitle: 'Statistiques et analyses',
      body: 'Consultez les rapports de performance de vos classes.',
    },
    'Inscriptions': {
      title: 'Inscriptions',
      subtitle: 'Gestion des inscriptions',
      body: 'Consultez les inscriptions et paiements de vos classes.',
    },
  };

  const content = copy[tab] || { title: tab, subtitle: '', body: '' };

  return (
    <ScrollView flex={1} backgroundColor={colors.background} showsVerticalScrollIndicator={false}>
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$4">
        <YStack gap="$1">
          <SizableText color={colors.mutedForeground} size="$3">ESPACE ENSEIGNANT</SizableText>
          <H1 color={colors.foreground} fontWeight="800">{content.title}</H1>
        </YStack>
        
        <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$6" padding="$5" gap="$3">
          {content.restricted && (
            <YStack backgroundColor={colors.warning + '15'} borderRadius="$3" padding="$3" marginBottom="$2">
              <SizableText color={colors.warning} fontWeight="700" size="$3">
                ⚠️ Accès en lecture seule
              </SizableText>
            </YStack>
          )}
          <H2 color={colors.foreground}>{content.subtitle}</H2>
          <Paragraph color={colors.mutedForeground}>{content.body}</Paragraph>
          {!content.restricted && (
            <Button marginTop="$3" backgroundColor={colors.accent} color={colors.accentForeground} borderRadius="$4">
              Ouvrir
            </Button>
          )}
        </Card>
      </YStack>
    </ScrollView>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('Accueil');
  const { colors } = useTheme();
  const { user, isAuthenticated, loading, isTeacher, isAdmin, isSurveillant } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [mobileNav, setMobileNav] = useState(false);

  const navItems = getNavItemsForRole(user?.role);

  const renderContent = () => {
    if (!user) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
          <ActivityIndicator size="large" color={colors.accent} />
          <SizableText color={colors.mutedForeground}>Chargement...</SizableText>
        </YStack>
      );
    }

    switch (activeTab) {
      case 'Accueil':
        return <DashboardScreen onNavigate={(tab) => setActiveTab(tab as Tab)} />;
      case 'Mes classes':
        return <EnrollmentScreen />;
      case 'Notes':
        return <GradesScreen />;
      case 'Pointage':
        return <AttendanceScreen />;
      case 'Emploi du temps':
        return <ScheduleScreen />;
      case 'Messages':
        return <ChatScreen />;
      case 'Rapports':
        return <ReportsScreen />;
      case 'Inscriptions':
        return <EnrollmentScreen />;
      default:
        return <DashboardScreen onNavigate={(tab) => setActiveTab(tab as Tab)} />;
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <YStack flex={1} backgroundColor={colors.background} justifyContent="center" alignItems="center" gap="$4">
        <ActivityIndicator size="large" color={colors.accent} />
        <SizableText color={colors.mutedForeground}>Chargement...</SizableText>
      </YStack>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <YStack flex={1} backgroundColor={colors.background} justifyContent="center" alignItems="center" padding="$6" gap="$4">
        <YStack backgroundColor={colors.accent} padding="$4" borderRadius="$6">
          <SizableText color={colors.accentForeground} size="$8" fontWeight="800">LH</SizableText>
        </YStack>
        <H1 color={colors.foreground} fontWeight="800" textAlign="center">Lycée Horizon</H1>
        <Paragraph color={colors.mutedForeground} textAlign="center">
          Espace enseignant · Pointage, notes, messagerie
        </Paragraph>
        <Button
          backgroundColor={colors.accent}
          color={colors.accentForeground}
          height={54}
          borderRadius="$5"
          onPress={() => navigation.navigate('login' as never)}
        >
          Se connecter
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor={colors.background}>
      {/* Main Content */}
      <YStack flex={1}>
        {renderContent()}
      </YStack>

      {/* Bottom Navigation */}
      <XStack
        backgroundColor={colors.card}
        borderTopWidth={1}
        borderColor={colors.border}
        paddingHorizontal="$1"
        paddingTop="$2"
        paddingBottom={insets.bottom + 8}
        justifyContent="space-around"
      >
        {navItems.map(({ label, icon: Icon }) => {
          const active = activeTab === label;
          return (
            <Button
              key={label}
              chromeless
              flex={1}
              minHeight={52}
              paddingHorizontal="$1"
              gap="$1"
              color={active ? colors.accent : colors.mutedForeground}
              icon={<Icon size={19} color={active ? colors.accent : colors.mutedForeground} />}
              onPress={() => {
                tapFeedback();
                setActiveTab(label);
              }}
            >
              {label === 'Emploi du temps' ? 'Planning' : label}
            </Button>
          );
        })}
      </XStack>

      {/* Mobile Menu Overlay */}
      {mobileNav && user && (
        <>
          <XStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
            zIndex={50}
            onPress={() => setMobileNav(false)}
          />
          <YStack
            position="absolute"
            top={0}
            left={0}
            bottom={0}
            width={280}
            backgroundColor={colors.card}
            borderRightWidth={1}
            borderColor={colors.border}
            paddingTop={insets.top + 16}
            paddingHorizontal="$4"
            paddingBottom={insets.bottom + 16}
            zIndex={60}
            gap="$4"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <H2 color={colors.foreground} fontWeight="800">Menu</H2>
              <Button circular size="$3" backgroundColor={colors.secondary} onPress={() => setMobileNav(false)}>
                <X size={18} color={colors.foreground} />
              </Button>
            </XStack>
            
            <YStack gap="$2">
              {navItems.map(({ label, icon: Icon }) => (
                <Button
                  key={label}
                  chromeless
                  height={48}
                  paddingHorizontal="$3"
                  justifyContent="flex-start"
                  gap="$3"
                  color={activeTab === label ? colors.accent : colors.foreground}
                  backgroundColor={activeTab === label ? colors.accent + '15' : 'transparent'}
                  icon={<Icon size={20} color={activeTab === label ? colors.accent : colors.foreground} />}
                  onPress={() => {
                    tapFeedback();
                    setActiveTab(label);
                    setMobileNav(false);
                  }}
                >
                  <SizableText size="$3" fontWeight="600">{label}</SizableText>
                </Button>
              ))}
            </YStack>

            <YStack position="absolute" bottom={0} left={0} right={0} paddingHorizontal="$4" paddingBottom={insets.bottom + 8}>
              <Card backgroundColor={colors.secondary} borderRadius="$4" padding="$4" gap="$2">
                <XStack gap="$3" alignItems="center">
                  <YStack
                    width={40}
                    height={40}
                    borderRadius="$3"
                    backgroundColor={colors.accent}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <SizableText color={colors.accentForeground} size="$3" fontWeight="800">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </SizableText>
                  </YStack>
                  <YStack flex={1}>
                    <SizableText color={colors.foreground} fontWeight="700" size="$3">
                      {user.first_name} {user.last_name}
                    </SizableText>
                    <SizableText color={colors.mutedForeground} size="$2">{user.email}</SizableText>
                  </YStack>
                </XStack>
              </Card>
            </YStack>
          </YStack>
        </>
      )}
    </YStack>
  );
}