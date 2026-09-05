import { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
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
  CheckCircle2,
  ChevronRight,
  UsersRound,
  BookOpen,
  BarChart2,
  CalendarDays,
  Download,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api, type Note, type Absence, type TeacherAssignment, type Etudiant } from '@/lib/api';
import * as Haptics from 'expo-haptics';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

type ReportPeriod = 'week' | 'month' | 'trimester' | 'year';

interface ReportStats {
  totalStudents: number;
  activeStudents: number;
  totalClasses: number;
  totalSubjects: number;
  averageGrade: number;
  attendanceRate: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  gradesBySubject: Array<{ subject: string; average: number; count: number }>;
  attendanceByDay: Array<{ day: string; present: number; late: number; absent: number }>;
  topStudents: Array<{ id: number; name: string; average: number; classe: string }>;
  lowPerformers: Array<{ id: number; name: string; average: number; classe: string }>;
}

function StatCard({ label, value, icon: Icon, accentColor, detail }: {
  label: string;
  value: string | number;
  icon: typeof UsersRound;
  accentColor: string;
  detail?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card
      backgroundColor={colors.card}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$4"
      padding="$4"
      flex={1}
    >
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
        <YStack
          width={36}
          height={36}
          borderRadius="$3"
          backgroundColor={accentColor + '18'}
          alignItems="center"
          justifyContent="center"
        >
          <Icon size={18} color={accentColor} />
        </YStack>
      </XStack>
      <SizableText color={colors.mutedForeground} size="$1" fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </SizableText>
      <H3 color={colors.foreground} marginTop="$1" marginBottom="$1">{value}</H3>
      {detail && (
        <SizableText color={colors.mutedForeground} size="$2">{detail}</SizableText>
      )}
    </Card>
  );
}

function SubjectBar({ subject, average, maxWidth = 150 }: { subject: string; average: number; maxWidth?: number }) {
  const { colors } = useTheme();
  const percentage = (average / 20) * 100;
  const color = average >= 10 ? colors.success : average >= 8 ? colors.warning : colors.destructive;
  
  return (
    <YStack gap="$1" marginBottom="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <SizableText color={colors.foreground} size="$2" fontWeight="600" flex={1}>
          {subject}
        </SizableText>
        <SizableText color={colors.mutedForeground} size="$2">
          {average.toFixed(1)}/20
        </SizableText>
      </XStack>
      <YStack height={8} backgroundColor={colors.muted} borderRadius="$2" overflow="hidden">
        <YStack 
          height="100%" 
          width={`${Math.min(100, percentage)}%`} 
          backgroundColor={color}
          borderRadius="$2"
        />
      </YStack>
    </YStack>
  );
}

function StudentRow({ name, average, classe, isLow }: { name: string; average: number; classe: string; isLow?: boolean }) {
  const { colors } = useTheme();
  const color = isLow ? colors.destructive : colors.success;
  
  return (
    <XStack gap="$3" alignItems="center" padding="$3" backgroundColor={colors.muted} borderRadius="$3" marginBottom="$2">
      <YStack flex={1} gap="$1">
        <SizableText color={colors.foreground} fontWeight="600" size="$3">{name}</SizableText>
        <SizableText color={colors.mutedForeground} size="$2">{classe}</SizableText>
      </YStack>
      <YStack
        backgroundColor={color + '20'}
        borderRadius="$2"
        paddingHorizontal="$2"
        paddingVertical="$1"
        alignItems="center"
        minWidth={50}
      >
        <SizableText color={color} size="$2" fontWeight="800">{average.toFixed(1)}</SizableText>
      </YStack>
    </XStack>
  );
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>('month');

  // Fetch teacher's assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: TeacherAssignment[] }>(`/api/teacher-assignments/?professeur=${user.id}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  // Fetch teacher's students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['my-students', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: Etudiant[] }>(`/api/etudiants/?classe__teacher_assignments__professeur=${user.id}&actif=true`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  // Fetch grades for teacher's classes
  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['my-grades-report', user?.id, period],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: Note[] }>(`/api/notes/?professeur=${user.id}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  // Fetch attendance for teacher's classes
  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: ['my-absences-report', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: Absence[] }>(`/api/absences/?professeur=${user.id}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  const isLoading = assignmentsLoading || studentsLoading || gradesLoading || absencesLoading;

  // Calculate report statistics
  const stats: ReportStats = {
    totalStudents: students?.length || 0,
    activeStudents: students?.filter(s => s.actif).length || 0,
    totalClasses: new Set(assignments?.map(a => a.classe)).size || 0,
    totalSubjects: new Set(assignments?.map(a => a.matiere)).size || 0,
    averageGrade: 0,
    attendanceRate: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    gradesBySubject: [],
    attendanceByDay: [],
    topStudents: [],
    lowPerformers: [],
  };

  // Calculate average grade
  if (grades && grades.length > 0) {
    const validGrades = grades.filter(g => g.note && parseFloat(g.note) > 0);
    if (validGrades.length > 0) {
      stats.averageGrade = validGrades.reduce((sum, g) => sum + parseFloat(g.note), 0) / validGrades.length;
    }

    // Group by subject
    const subjectMap = new Map<string, { sum: number; count: number }>();
    validGrades.forEach(grade => {
      const subject = grade.matiere_detail?.nom || 'Inconnu';
      const current = subjectMap.get(subject) || { sum: 0, count: 0 };
      subjectMap.set(subject, {
        sum: current.sum + parseFloat(grade.note),
        count: current.count + 1,
      });
    });
    
    stats.gradesBySubject = Array.from(subjectMap.entries())
      .map(([subject, data]) => ({
        subject,
        average: data.count > 0 ? data.sum / data.count : 0,
        count: data.count,
      }))
      .sort((a, b) => b.average - a.average);
  }

  // Calculate attendance stats
  if (absences && absences.length > 0) {
    stats.presentCount = absences.filter(a => a.statut === 'PRESENT').length;
    stats.lateCount = absences.filter(a => a.statut === 'LATE').length;
    stats.absentCount = absences.filter(a => a.statut === 'ABSENT').length;
    const totalRecorded = stats.presentCount + stats.lateCount + stats.absentCount;
    stats.attendanceRate = totalRecorded > 0 ? (stats.presentCount / totalRecorded) * 100 : 0;

    // Group by day
    const dayMap = new Map<number, { present: number; late: number; absent: number }>();
    const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    absences.forEach(absence => {
      const dayIndex = new Date(absence.date_absence).getDay();
      const adjustedDay = dayIndex === 0 ? 6 : dayIndex - 1;
      const current = dayMap.get(adjustedDay) || { present: 0, late: 0, absent: 0 };
      if (absence.statut === 'PRESENT') current.present++;
      else if (absence.statut === 'LATE') current.late++;
      else if (absence.statut === 'ABSENT') current.absent++;
      dayMap.set(adjustedDay, current);
    });
    
    stats.attendanceByDay = DAY_NAMES.map((day, i) => ({
      day,
      ...(dayMap.get(i) || { present: 0, late: 0, absent: 0 }),
    }));
  }

  // Calculate top and low performers
  if (grades && students) {
    const studentGrades = new Map<number, { sum: number; count: number; name: string; classe: string }>();
    
    grades.forEach(grade => {
      if (!grade.note || parseFloat(grade.note) <= 0) return;
      const studentId = grade.etudiant;
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      
      const current = studentGrades.get(studentId) || { sum: 0, count: 0, name: '', classe: '' };
      studentGrades.set(studentId, {
        sum: current.sum + parseFloat(grade.note),
        count: current.count + 1,
        name: student.user_detail?.full_name || `Élève ${studentId}`,
        classe: student.classe_detail?.nom || '—',
      });
    });

    const averages = Array.from(studentGrades.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        classe: data.classe,
        average: data.count > 0 ? data.sum / data.count : 0,
        count: data.count,
      }))
      .filter(s => s.count > 0);

    stats.topStudents = averages
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    stats.lowPerformers = averages
      .sort((a, b) => a.average - b.average)
      .slice(0, 5);
  }

  const periodLabels: Record<ReportPeriod, string> = {
    week: 'Cette semaine',
    month: 'Ce mois',
    trimester: 'Ce trimestre',
    year: 'Cette année',
  };

  const handleExport = () => {
    alert('Export PDF/Excel disponible dans une prochaine version.');
  };

  return (
    <ScrollView
      flex={1}
      showsVerticalScrollIndicator={false}
    >
      <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$8" gap="$5">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1" flex={1}>
            <H1 color={colors.foreground} fontWeight="800">Rapports</H1>
            <SizableText color={colors.mutedForeground} size="$4">
              {periodLabels[period]} · {stats.totalStudents} élève(s)
            </SizableText>
          </YStack>
          <Button
            size="$3"
            backgroundColor={colors.accent}
            color={colors.accentForeground}
            borderRadius="$3"
            onPress={handleExport}
          >
            <XStack gap="$1" alignItems="center">
              <Download size={16} />
              <SizableText size="$2" fontWeight="700">Exporter</SizableText>
            </XStack>
          </Button>
        </XStack>

        {/* Period Selector */}
        <XStack gap="$2" flexWrap="wrap">
          {[
            { key: 'week', label: 'Semaine' },
            { key: 'month', label: 'Mois' },
            { key: 'trimester', label: 'Trimestre' },
            { key: 'year', label: 'Année' },
          ].map(p => (
            <Button
              key={p.key}
              height={40}
              paddingHorizontal="$4"
              backgroundColor={period === p.key ? colors.accent : colors.card}
              color={period === p.key ? colors.accentForeground : colors.foreground}
              borderColor={colors.border}
              borderWidth={1}
              borderRadius="$3"
              onPress={() => { tapFeedback(); setPeriod(p.key as ReportPeriod); }}
            >
              <SizableText size="$2" fontWeight="700">{p.label}</SizableText>
            </Button>
          ))}
        </XStack>

        {/* Overview Stats */}
        <YStack gap="$3">
          <XStack gap="$3" flexWrap="wrap">
            <StatCard label="Classes" value={stats.totalClasses} icon={UsersRound} accentColor={colors.accent} />
            <StatCard label="Matières" value={stats.totalSubjects} icon={BookOpen} accentColor={colors.warning} />
            <StatCard label="Moy. générale" value={`${stats.averageGrade.toFixed(1)}/20`} icon={BarChart2} accentColor={colors.info} />
            <StatCard label="Présence" value={`${stats.attendanceRate.toFixed(0)}%`} icon={CheckCircle2} accentColor={colors.success} />
          </XStack>
        </YStack>

        {/* Grades by Subject */}
        <YStack gap="$3">
          <H2 color={colors.foreground} fontWeight="700">Performance par matière</H2>
          <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$4">
            {isLoading ? (
              <YStack alignItems="center" padding="$4">
                <ActivityIndicator size="large" color={colors.accent} />
                <SizableText color={colors.mutedForeground} marginTop="$3">Chargement…</SizableText>
              </YStack>
            ) : stats.gradesBySubject.length > 0 ? (
              stats.gradesBySubject.map(item => (
                <SubjectBar key={item.subject} subject={item.subject} average={item.average} />
              ))
            ) : (
              <SizableText color={colors.mutedForeground} textAlign="center" padding="$4">
                Aucune donnée de notes disponible
              </SizableText>
            )}
          </Card>
        </YStack>

        {/* Attendance Summary */}
        <YStack gap="$3">
          <H2 color={colors.foreground} fontWeight="700">Résumé des présences</H2>
          <XStack gap="$2" flexWrap="wrap">
            <Card flex={1} minWidth={70} backgroundColor={colors.success + '18'} borderRadius="$4" padding="$3" alignItems="center">
              <SizableText color={colors.success} size="$2">Présents</SizableText>
              <H2 color={colors.success}>{stats.presentCount}</H2>
            </Card>
            <Card flex={1} minWidth={70} backgroundColor={colors.warning + '18'} borderRadius="$4" padding="$3" alignItems="center">
              <SizableText color={colors.warning} size="$2">Retards</SizableText>
              <H2 color={colors.warning}>{stats.lateCount}</H2>
            </Card>
            <Card flex={1} minWidth={70} backgroundColor={colors.destructive + '18'} borderRadius="$4" padding="$3" alignItems="center">
              <SizableText color={colors.destructive} size="$2">Absents</SizableText>
              <H2 color={colors.destructive}>{stats.absentCount}</H2>
            </Card>
          </XStack>
        </YStack>

        {/* Top & Low Performers */}
        <YStack gap="$3">
          <XStack gap="$3">
            <YStack flex={1} gap="$2">
              <H3 color={colors.success} fontWeight="700">Meilleurs élèves</H3>
              <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$3">
                {stats.topStudents.length > 0 ? (
                  stats.topStudents.map(student => (
                    <StudentRow
                      key={student.id}
                      name={student.name}
                      average={student.average}
                      classe={student.classe}
                    />
                  ))
                ) : (
                  <SizableText color={colors.mutedForeground} textAlign="center" padding="$3">
                    Aucune donnée
                  </SizableText>
                )}
              </Card>
            </YStack>
            
            <YStack flex={1} gap="$2">
              <H3 color={colors.destructive} fontWeight="700">À suivre</H3>
              <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$3">
                {stats.lowPerformers.length > 0 ? (
                  stats.lowPerformers.map(student => (
                    <StudentRow
                      key={student.id}
                      name={student.name}
                      average={student.average}
                      classe={student.classe}
                      isLow
                    />
                  ))
                ) : (
                  <SizableText color={colors.mutedForeground} textAlign="center" padding="$3">
                    Aucune donnée
                  </SizableText>
                )}
              </Card>
            </YStack>
          </XStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}