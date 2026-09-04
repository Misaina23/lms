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
  Users,
  BookOpen,
  CheckCircle2,
  CalendarDays,
  MessageCircle,
  BarChart2,
  Search,
  Filter,
  ChevronRight,
  Bell,
  Menu,
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

function StatCard({ label, value, icon: Icon, accentColor, trend }: {
  label: string;
  value: string | number;
  icon: typeof Users;
  accentColor: string;
  trend?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card
      backgroundColor={colors.card}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$5"
      padding="$4"
      flex={1}
    >
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
        <YStack
          width={40}
          height={40}
          borderRadius="$4"
          backgroundColor={accentColor + '18'}
          alignItems="center"
          justifyContent="center"
        >
          <Icon size={20} color={accentColor} />
        </YStack>
        {trend && (
          <XStack alignItems="center" gap="$1">
            <SizableText color={colors.success} size="$2" fontWeight="700">{trend}</SizableText>
          </XStack>
        )}
      </XStack>
      <SizableText color={colors.mutedForeground} size="$2" fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </SizableText>
      <H2 color={colors.foreground} marginTop="$1" marginBottom="$1">{value}</H2>
    </Card>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  const { colors } = useTheme();
  return (
    <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
      <H3 color={colors.foreground} fontWeight="800">{title}</H3>
      {action ? <SizableText color={colors.accent} fontWeight="700" size="$3">{action}</SizableText> : null}
    </XStack>
  );
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
export function DashboardScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { colors } = useTheme();
  const { user } = useAuth();
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
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0=Monday
      const res = await api.get<{ results: TimetableSlot[] }>(`/api/timetable/?professeur=${user.id}&day_of_week=${adjustedDay}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  return (
    <ScrollView flex={1} showsVerticalScrollIndicator={false}>
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$5">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1" flex={1}>
            <SizableText color={colors.mutedForeground} size="$3">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</SizableText>
            <H1 color={colors.foreground} fontWeight="800" letterSpacing={-1}>Bonjour, {user?.first_name || 'Enseignant'}</H1>
            <SizableText color={colors.mutedForeground} size="$4">{user?.teacher_type === 'FONCTIONNAIRE' ? 'Fonctionnaire' : user?.teacher_type === 'SUPPLEANT' ? 'Suppléant' : 'Enseignant'}</SizableText>
          </YStack>
          <XStack gap="$2">
            <Button circular size="$5" backgroundColor={colors.secondary} icon={<Bell size={20} color={colors.accent} />} onPress={() => onNavigate('Messages')} aria-label="Notifications" />
            <Button circular size="$5" backgroundColor={colors.secondary} icon={<Menu size={20} color={colors.foreground} />} onPress={() => {}} aria-label="Menu" />
          </XStack>
        </XStack>

        {/* Quick Actions */}
        <XStack gap="$3">
          <Button flex={1} height={56} backgroundColor={colors.accent} color={colors.accentForeground} borderRadius="$5" icon={<ClipboardCheck size={20} />} onPress={() => { tapFeedback(); onNavigate('Notes'); }}>
            Saisir les notes
          </Button>
          <Button flex={1} height={56} backgroundColor={colors.secondary} color={colors.foreground} borderRadius="$5" icon={<CheckCircle2 size={20} />} onPress={() => { tapFeedback(); onNavigate('Pointage'); }}>
            Pointer
          </Button>
        </XStack>

        {/* Stats Grid */}
        {stats && (
          <>
            <YStack gap="$3">
              <SectionTitle title="Vue d'ensemble" />
              <XStack gap="$3" flexWrap="wrap">
                <StatCard label="Mes classes" value={stats.myClasses} icon={Users} accentColor={colors.accent} />
                <StatCard label="Mes élèves" value={stats.myStudents} icon={Users} accentColor={colors.success} />
              </XStack>
              <XStack gap="$3" flexWrap="wrap">
                <StatCard label="Mes matières" value={stats.mySubjects} icon={BookOpen} accentColor={colors.warning} />
                <StatCard label="Présence aujourd'hui" value={`${stats.todayAttendance}/${stats.myStudents}`} icon={CheckCircle2} accentColor={colors.info} trend={`${stats.attendanceRate}%`} />
              </XStack>
            </YStack>
          </>
        )}

        {/* Today's Schedule */}
        <YStack>
          <SectionTitle title="Emploi du temps du jour" action="Voir tout" />
          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4" gap="$3">
            {scheduleLoading ? (
              <SizableText color={colors.mutedForeground}>Chargement…</SizableText>
            ) : todaySchedule && todaySchedule.length > 0 ? (
              todaySchedule.map((slot) => (
                <XStack key={slot.id} gap="$3" alignItems="center" padding="$3" backgroundColor={colors.muted} borderRadius="$4">
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
                      <H3 color={colors.foreground}>{slot.matiere_name || 'Matière'}</H3>
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
        <YStack>
          <SectionTitle title="Notes en attente" action={stats?.pendingGrades ? `${stats.pendingGrades} à saisir` : 'Tout à jour'} />
          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4" gap="$3">
            {notesLoading ? (
              <SizableText color={colors.mutedForeground}>Chargement…</SizableText>
            ) : recentNotes && recentNotes.length > 0 ? (
              recentNotes.map((note) => (
                <XStack key={note.id} gap="$3" alignItems="center" padding="$3" backgroundColor={colors.muted} borderRadius="$4">
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
        <YStack>
          <SectionTitle title="Accès rapide" />
          <XStack gap="$3" flexWrap="wrap">
            {[
              { label: 'Mes classes', icon: Users, color: colors.accent, screen: 'Classes' },
              { label: 'Emploi du temps', icon: CalendarDays, color: colors.info, screen: 'Emploi du temps' },
              { label: 'Pointage', icon: CheckCircle2, color: colors.success, screen: 'Pointage' },
              { label: 'Notes', icon: ClipboardCheck, color: colors.warning, screen: 'Notes' },
              { label: 'Messages', icon: MessageCircle, color: colors.info, screen: 'Messages' },
              { label: 'Rapports', icon: BarChart2, color: colors.accent, screen: 'Rapports' },
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