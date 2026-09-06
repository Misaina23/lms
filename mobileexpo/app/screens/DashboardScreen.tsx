import { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  YStack,
  XStack,
  ScrollView,
  Card,
  Button,
  H1,
  H2,
  H3,
  Paragraph,
  SizableText,
  Avatar,
  ClipboardCheck,
  UsersRound,
  BookOpen,
  CheckCircle2,
  CalendarDays,
  MessageCircle,
  BarChart2,
  Search,
  ChevronRight,
  Bell,
  Menu,
  X,
  Input,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api, type TeacherAssignment, type Etudiant, type Note, type Absence, type TimetableSlot } from '@/lib/api';
import * as Haptics from 'expo-haptics';

// Types
interface DashboardStats {
  myClasses: number;
  myStudents: number;
  mySubjects: number;
  pendingGrades: number;
  todayAttendance: number;
  attendanceRate: number;
}

interface AssignmentWithDetails extends TeacherAssignment {
  classe_detail: { id: number; nom: string; niveau: string };
  matiere_detail: { id: number; nom: string; code: string };
  professeur_detail: { id: number; matricule: string; name: string };
}

interface StudentWithUser extends Etudiant {
  user_detail: {
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string;
  };
  classe_detail: {
    id: number;
    nom: string;
    niveau: string;
    stream: string | null;
  };
}

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

function StatusPill({ label, tone = 'green' }: { label: string; tone?: 'green' | 'amber' | 'blue' | 'red' }) {
  const { colors } = useTheme();
  const colorMap = {
    green: { bg: colors.success + '20', text: colors.success },
    amber: { bg: colors.warning + '20', text: colors.warning },
    blue: { bg: colors.info + '20', text: colors.info },
    red: { bg: colors.destructive + '20', text: colors.destructive },
  };
  const { bg, text } = colorMap[tone];
  return (
    <YStack backgroundColor={bg} borderRadius="$10" paddingHorizontal="$3" paddingVertical="$2">
      <SizableText color={text} size="$2" fontWeight="700">{label}</SizableText>
    </YStack>
  );
}

// Dashboard Screen
export default function DashboardScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const [assignmentsRes, studentsRes, notesRes, absencesRes] = await Promise.all([
        api.get<{ results: AssignmentWithDetails[] }>(`/api/teacher-assignments/?professeur=${user.id}`).catch(() => ({ results: [] })),
        api.get<{ results: StudentWithUser[] }>(`/api/etudiants/?classe__teacher_assignments__professeur=${user.id}&actif=true`).catch(() => ({ results: [] })),
        api.get<{ results: Note[] }>(`/api/notes/?professeur=${user.id}&status=DRAFT`).catch(() => ({ results: [] })),
        api.get<{ results: Absence[] }>(`/api/absences/?professeur=${user.id}&date_absence=${new Date().toISOString().slice(0, 10)}`).catch(() => ({ results: [] })),
      ]);

      const assignments = assignmentsRes.results || [];
      const students = studentsRes.results || [];
      const pendingNotes = notesRes.results || [];
      const todayAbsences = absencesRes.results || [];

      const uniqueClasses = new Set(assignments.map(a => a.classe)).size;
      const uniqueSubjects = new Set(assignments.map(a => a.matiere)).size;
      const presentCount = todayAbsences.filter(a => a.statut === 'PRESENT').length;
      const totalStudents = students.length;
      const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

      return {
        myClasses: uniqueClasses,
        myStudents: totalStudents,
        mySubjects: uniqueSubjects,
        pendingGrades: pendingNotes.length,
        todayAttendance: presentCount,
        attendanceRate,
      };
    },
    enabled: !!user,
  });

  const { data: recentNotes, isLoading: notesLoading } = useQuery({
    queryKey: ['recent-notes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: Note[] }>(`/api/notes/?professeur=${user.id}&ordering=-date_evaluation&page_size=5`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  const { data: todaySchedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['today-schedule', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const dayOfWeek = new Date().getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const res = await api.get<{ results: TimetableSlot[] }>(`/api/timetable/?professeur=${user.id}&day_of_week=${adjustedDay}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  if (statsLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" paddingTop={insets.top + 40}>
        <ActivityIndicator size="large" color={colors.accent} />
        <SizableText color={colors.mutedForeground}>Chargement...</SizableText>
      </YStack>
    );
  }

  const nextClass = todaySchedule && todaySchedule.length > 0 ? todaySchedule[0] : null;

  return (
    <ScrollView flex={1} showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>
      <YStack paddingHorizontal="$4" paddingTop={insets.top + 16} paddingBottom="$8" gap="$5">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1" flex={1}>
            <SizableText color={colors.mutedForeground} size="$3" fontWeight="600">Accueil</SizableText>
            <H1 color={colors.foreground} fontWeight="800" fontSize={22}>Bonjour, {user?.first_name || 'Enseignant'} 👋</H1>
          </YStack>
          <XStack gap="$2">
            <Button circular size="$5" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} icon={<Bell size={18} color={colors.accent} />} onPress={() => onNavigate('Messages')} aria-label="Notifications">
              <YStack position="absolute" top={8} right={8} width={8} height={8} borderRadius="$2" backgroundColor={colors.destructive} />
            </Button>
          </XStack>
        </XStack>

        {/* Level Card */}
        <Card 
          backgroundColor={colors.primary + '20'} 
          borderWidth={1} 
          borderColor={colors.accent + '40'} 
          borderRadius="$6" 
          padding="$5"
          shadowColor={colors.accent}
          shadowOffset={{ width: 0, height: 0 }}
          shadowOpacity={0.2}
          shadowRadius={20}
        >
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1} gap="$2">
              <SizableText color={colors.mutedForeground} size="$2" fontWeight="600">Niveau actuel</SizableText>
              <XStack justifyContent="space-between" alignItems="center">
                <H2 color={colors.foreground} fontWeight="800" fontSize={18}>Élève Avancé</H2>
                <YStack width={34} height={34} borderRadius="$3" backgroundColor={colors.warning} alignItems="center" justifyContent="center">
                  <SizableText color="#fff" fontSize={16}>⭐</SizableText>
                </YStack>
              </XStack>
              <YStack height={6} backgroundColor={colors.border} borderRadius="$3" overflow="hidden" marginTop="$2">
                <YStack width="70%" height="100%" backgroundColor={colors.primary} borderRadius="$3" />
              </YStack>
              <SizableText color={colors.mutedForeground} size="$1" textAlign="right" fontWeight="600">70%</SizableText>
            </YStack>
          </XStack>
        </Card>

        {/* Quick Actions Grid */}
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H3 color={colors.foreground} fontWeight="800" fontSize={16}>Accès rapides</H3>
            <SizableText color={colors.accent} fontWeight="700" size="$3">Voir tout</SizableText>
          </XStack>
          <XStack gap="$3" flexWrap="wrap">
            {[
              { label: 'Pointage', icon: CheckCircle2, color: colors.success, screen: 'Pointage' },
              { label: 'Messagerie', icon: MessageCircle, color: colors.primary, screen: 'Messages' },
              { label: 'Notes', icon: ClipboardCheck, color: colors.warning, screen: 'Notes' },
              { label: 'Planning', icon: CalendarDays, color: colors.accent, screen: 'Planning' },
              { label: 'Notifications', icon: Bell, color: colors.info, screen: 'Notifications' },
            ].map((item) => (
              <YStack 
                key={item.label} 
                flex={1} 
                minWidth="30%" 
                maxWidth="33%"
                backgroundColor={colors.card} 
                borderWidth={1} 
                borderColor={colors.border} 
                borderRadius="$4" 
                padding="$3" 
                alignItems="center" 
                gap="$2"
                onPress={() => { tapFeedback(); if (item.screen) onNavigate(item.screen); }}
              >
                <YStack 
                  width={36} 
                  height={36} 
                  borderRadius="$3" 
                  backgroundColor={item.color + '25'} 
                  alignItems="center" 
                  justifyContent="center"
                >
                  <item.icon size={18} color={item.color} />
                </YStack>
                <SizableText color={colors.foreground} fontWeight="700" size="$2" textAlign="center">{item.label}</SizableText>
              </YStack>
            ))}
          </XStack>
        </YStack>

        {/* Next Class Card */}
        {nextClass && (
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <H3 color={colors.foreground} fontWeight="800" fontSize={16}>Prochain cours</H3>
            </XStack>
            <Card 
              backgroundColor={colors.card} 
              borderWidth={1} 
              borderColor={colors.border} 
              borderRadius="$4" 
              padding="$4"
              flexDirection="row"
              alignItems="center"
              gap="$3"
              onPress={() => onNavigate('Emploi du temps')}
            >
              <YStack 
                width={38} 
                height={38} 
                borderRadius="$3" 
                backgroundColor={colors.primary + '25'} 
                alignItems="center" 
                justifyContent="center"
              >
                <CalendarDays size={18} color={colors.primary} />
              </YStack>
              <YStack flex={1} gap="$1">
                <SizableText color={colors.foreground} fontWeight="700" size="$3">{nextClass.matiere_name || 'Matière'}</SizableText>
                <SizableText color={colors.mutedForeground} size="$2">Aujourd'hui • {nextClass.start_hour} - {nextClass.end_hour}</SizableText>
              </YStack>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </Card>
          </YStack>
        )}

        {/* Stats Overview */}
        {stats && (
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <H3 color={colors.foreground} fontWeight="800" fontSize={16}>Vue d'ensemble</H3>
            </XStack>
            <XStack gap="$3" flexWrap="wrap">
              <YStack flex={1} minWidth="45%" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$4" padding="$4" gap="$2">
                <SizableText color={colors.mutedForeground} size="$2" fontWeight="600">Mes classes</SizableText>
                <H2 color={colors.foreground} fontSize={20}>{stats.myClasses}</H2>
              </YStack>
              <YStack flex={1} minWidth="45%" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$4" padding="$4" gap="$2">
                <SizableText color={colors.mutedForeground} size="$2" fontWeight="600">Mes élèves</SizableText>
                <H2 color={colors.foreground} fontSize={20}>{stats.myStudents}</H2>
              </YStack>
              <YStack flex={1} minWidth="45%" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$4" padding="$4" gap="$2">
                <SizableText color={colors.mutedForeground} size="$2" fontWeight="600">Mes matières</SizableText>
                <H2 color={colors.foreground} fontSize={20}>{stats.mySubjects}</H2>
              </YStack>
              <YStack flex={1} minWidth="45%" backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$4" padding="$4" gap="$2">
                <SizableText color={colors.mutedForeground} size="$2" fontWeight="600">Présence</SizableText>
                <H2 color={colors.foreground} fontSize={20}>{stats.todayAttendance}<SizableText color={colors.mutedForeground} fontSize={14}>/{stats.myStudents}</SizableText></H2>
                <StatusPill label={`${stats.attendanceRate}%`} tone="green" />
              </YStack>
            </XStack>
          </YStack>
        )}

        {/* Today's Schedule */}
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H3 color={colors.foreground} fontWeight="800" fontSize={16}>Emploi du temps</H3>
            <SizableText color={colors.accent} fontWeight="700" size="$3" onPress={() => onNavigate('Planning')}>Voir tout</SizableText>
          </XStack>
          <Card backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$5" padding="$4" gap="$3">
            {scheduleLoading ? (
              <SizableText color={colors.mutedForeground}>Chargement…</SizableText>
            ) : todaySchedule && todaySchedule.length > 0 ? (
              todaySchedule.map((slot) => (
                <XStack key={slot.id} gap="$3" alignItems="center" padding="$3" backgroundColor={colors.secondary} borderRadius="$4">
                  <YStack
                    width={48}
                    height={48}
                    borderRadius="$4"
                    backgroundColor={colors.accent + '20'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <CalendarDays size={22} color={colors.accent} />
                  </YStack>
                  <YStack flex={1}>
                    <XStack gap="$2" alignItems="center" flexWrap="wrap">
                      <H3 color={colors.foreground} fontSize={14}>{slot.matiere_name || 'Matière'}</H3>
                      {slot.classe_name && <StatusPill label={slot.classe_name} tone="blue" />}
                    </XStack>
                    <SizableText color={colors.mutedForeground} size="$3">
                      {slot.start_hour} - {slot.end_hour} · {slot.room || 'Salle non définie'}
                    </SizableText>
                  </YStack>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </XStack>
              ))
            ) : (
              <SizableText color={colors.mutedForeground} textAlign="center" padding="$4">
                Aucun cours prévu aujourd'hui
              </SizableText>
            )}
          </Card>
        </YStack>

        {/* Pending Grades */}
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H3 color={colors.foreground} fontWeight="800" fontSize={16}>Notes en attente</H3>
            <SizableText color={colors.accent} fontWeight="700" size="$3">{stats?.pendingGrades ? `${stats.pendingGrades} à saisir` : 'Tout à jour'}</SizableText>
          </XStack>
          <Card backgroundColor={colors.card} borderWidth={1} borderColor={colors.border} borderRadius="$5" padding="$4" gap="$3">
            {notesLoading ? (
              <SizableText color={colors.mutedForeground}>Chargement…</SizableText>
            ) : recentNotes && recentNotes.length > 0 ? (
              recentNotes.map((note) => (
                <XStack key={note.id} gap="$3" alignItems="center" padding="$3" backgroundColor={colors.secondary} borderRadius="$4">
                  <YStack
                    width={40}
                    height={40}
                    borderRadius="$4"
                    backgroundColor={colors.warning + '20'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <ClipboardCheck size={18} color={colors.warning} />
                  </YStack>
                  <YStack flex={1}>
                    <SizableText color={colors.foreground} fontWeight="700" size="$3">{note.matiere_detail?.nom || 'Matière'}</SizableText>
                    <SizableText color={colors.mutedForeground} size="$2">{note.etudiant_detail?.user_detail?.full_name || 'Élève'} · {note.score_1}/20</SizableText>
                  </YStack>
                  <StatusPill label="Brouillon" tone="amber" />
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </XStack>
              ))
            ) : (
              <SizableText color={colors.mutedForeground} textAlign="center" padding="$4">
                Aucune note en attente
              </SizableText>
            )}
          </Card>
        </YStack>

        {/* Quick Links */}
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H3 color={colors.foreground} fontWeight="800" fontSize={16}>Accès rapide</H3>
          </XStack>
          <XStack gap="$3" flexWrap="wrap">
            {[
              { label: 'Planning', icon: CalendarDays, color: colors.info, screen: 'Planning' },
              { label: 'Pointage', icon: CheckCircle2, color: colors.success, screen: 'Pointage' },
              { label: 'Notes', icon: ClipboardCheck, color: colors.warning, screen: 'Notes' },
              { label: 'Messages', icon: MessageCircle, color: colors.info, screen: 'Messages' },
              { label: 'Notifications', icon: Bell, color: colors.accent, screen: 'Notifications' },
              { label: 'Profil', icon: UsersRound, color: colors.primary, screen: 'Profil' },
            ].map((item) => (
              <Button
                key={item.label}
                flex={1}
                minWidth={140}
                height={100}
                backgroundColor={colors.card}
                borderColor={colors.border}
                borderWidth={1}
                borderRadius="$5"
                padding="$4"
                onPress={() => { tapFeedback(); onNavigate(item.screen); }}
              >
                <XStack alignItems="center" justifyContent="center" marginBottom="$2">
                  <YStack
                    width={44}
                    height={44}
                    borderRadius="$4"
                    backgroundColor={item.color + '20'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <item.icon size={22} color={item.color} />
                  </YStack>
                </XStack>
                <SizableText color={colors.foreground} fontWeight="700" size="$3" textAlign="center">{item.label}</SizableText>
              </Button>
            ))}
          </XStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
