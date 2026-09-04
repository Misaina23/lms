import { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Input,
  CheckCircle2,
  ChevronRight,
  Users,
  Search,
  Filter,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api, type Enrollment, type Etudiant, type TeacherAssignment } from '@/lib/api';
import * as Haptics from 'expo-haptics';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

const PAYMENT_STATUS_CONFIG = {
  PAID: { label: 'Payé', color: 'success', bg: 'success' },
  PARTIAL: { label: 'Partiel', color: 'warning', bg: 'warning' },
  UNPAID: { label: 'Non payé', color: 'destructive', bg: 'destructive' },
};

function StatusPill({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const config = PAYMENT_STATUS_CONFIG[status as keyof typeof PAYMENT_STATUS_CONFIG] || PAYMENT_STATUS_CONFIG.UNPAID;
  const color = colors[config.color as keyof typeof colors];
  const paddingH = size === 'sm' ? '$2' : '$3';
  const paddingV = size === 'sm' ? '$1' : '$2';
  const fontSize = size === 'sm' ? '$1' : '$2';
  
  return (
    <YStack backgroundColor={color + '20'} borderRadius="$10" paddingHorizontal={paddingH} paddingVertical={paddingV}>
      <XStack gap="$1" alignItems="center">
        <SizableText color={color} size={fontSize} fontWeight="700">{config.label}</SizableText>
      </XStack>
    </YStack>
  );
}

function EnrollmentCard({ 
  enrollment, 
  onConfirmPayment 
}: { 
  enrollment: Enrollment & { 
    student_detail: any;
    classe_detail: any;
  };
  onConfirmPayment: (id: string) => void;
}) {
  const { colors } = useTheme();
  const student = enrollment.student_detail?.user_detail || enrollment.student_detail;
  
  return (
    <Card
      backgroundColor={colors.card}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius="$4"
      padding="$4"
      marginBottom="$2"
    >
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
        <YStack flex={1} gap="$2">
          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <SizableText color={colors.foreground} fontWeight="700" size="$3">
              {student?.full_name || `${student?.first_name} ${student?.last_name}` || `Élève #${enrollment.student}`}
            </SizableText>
            <StatusPill status={enrollment.payment_status} size="md" />
          </XStack>
          
          <XStack gap="$3" alignItems="center" flexWrap="wrap">
            <YStack backgroundColor={colors.secondary} borderRadius="$2" paddingHorizontal="$2" paddingVertical="$1">
              <SizableText color={colors.mutedForeground} size="$2" fontWeight="600">
                {enrollment.classe_detail?.nom || 'Classe'}
              </SizableText>
            </YStack>
            <SizableText color={colors.mutedForeground} size="$2">
              {enrollment.academic_year}
            </SizableText>
          </XStack>
          
          <XStack gap="$3" alignItems="center" flexWrap="wrap" marginTop="$1">
            <SizableText color={colors.mutedForeground} size="$2">
              Reçu: {enrollment.receipt_number}
            </SizableText>
          </XStack>
          
          <XStack gap="$4" alignItems="center" marginTop="$1">
            <YStack gap="$1">
              <SizableText color={colors.mutedForeground} size="$1">Total</SizableText>
              <SizableText color={colors.foreground} fontWeight="700" size="$3">
                {enrollment.frais_total ? `${parseFloat(enrollment.frais_total).toLocaleString('fr-FR')} XOF` : '—'}
              </SizableText>
            </YStack>
            <YStack gap="$1">
              <SizableText color={colors.mutedForeground} size="$1">Versé</SizableText>
              <SizableText color={colors.success} fontWeight="700" size="$3">
                {enrollment.frais_verses ? `${parseFloat(enrollment.frais_verses).toLocaleString('fr-FR')} XOF` : '0 XOF'}
              </SizableText>
            </YStack>
            {enrollment.frais_total && enrollment.frais_verses && (
              <YStack gap="$1">
                <SizableText color={colors.mutedForeground} size="$1">Reste</SizableText>
                <SizableText color={colors.warning} fontWeight="700" size="$3">
                  {(parseFloat(enrollment.frais_total) - parseFloat(enrollment.frais_verses)).toLocaleString('fr-FR')} XOF
                </SizableText>
              </YStack>
            )}
          </XStack>
        </YStack>
        
        <XStack gap="$2" alignItems="center">
          <ChevronRight size={18} color={colors.mutedForeground} />
        </XStack>
      </XStack>
    </Card>
  );
}

export function EnrollmentScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Fetch teacher's classes
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get<{ results: TeacherAssignment[] }>(`/api/teacher-assignments/?professeur=${user.id}`).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user,
  });

  const myClassIds = assignments?.map(a => a.classe) || [];

  // Fetch enrollments for teacher's classes
  const { data: enrollments, isLoading: enrollmentsLoading, refetch } = useQuery({
    queryKey: ['my-enrollments', user?.id, myClassIds, statusFilter],
    queryFn: async () => {
      if (!user || myClassIds.length === 0) return [];
      const classParam = myClassIds.join(',');
      const statusParam = statusFilter !== 'ALL' ? `&payment_status=${statusFilter}` : '';
      const res = await api.get<{ results: Enrollment[] }>(
        `/api/enrollments/?classe__in=${classParam}${statusParam}`
      ).catch(() => ({ results: [] }));
      return res.results || [];
    },
    enabled: !!user && myClassIds.length > 0,
  });

  // Fetch student details for each enrollment
  const { data: studentsMap, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-map', enrollments],
    queryFn: async () => {
      if (!enrollments) return new Map();
      const studentIds = [...new Set(enrollments.map(e => e.student))];
      const res = await api.get<{ results: Etudiant[] }>(
        `/api/etudiants/?id__in=${studentIds.join(',')}`
      ).catch(() => ({ results: [] }));
      const map = new Map();
      (res.results || []).forEach(s => map.set(s.id, s));
      return map;
    },
    enabled: !!enrollments && enrollments.length > 0,
  });

  // Fetch class details
  const { data: classesMap, isLoading: classesLoading } = useQuery({
    queryKey: ['classes-map', myClassIds],
    queryFn: async () => {
      if (myClassIds.length === 0) return new Map();
      const res = await api.get<{ results: any[] }>(
        `/api/classes/?id__in=${myClassIds.join(',')}`
      ).catch(() => ({ results: [] }));
      const map = new Map();
      (res.results || []).forEach(c => map.set(c.id, c));
      return map;
    },
    enabled: myClassIds.length > 0,
  });

  // Enhance enrollments with details
  const enrichedEnrollments = (enrollments || []).map(enrollment => ({
    ...enrollment,
    student_detail: studentsMap?.get(enrollment.student),
    classe_detail: classesMap?.get(enrollment.classe || 0),
  }));

  const filteredEnrollments = enrichedEnrollments.filter(enrollment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const student = enrollment.student_detail?.user_detail;
    const studentName = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
    const matricule = student?.matricule?.toLowerCase() || '';
    const className = enrollment.classe_detail?.nom?.toLowerCase() || '';
    return studentName.includes(query) || matricule.includes(query) || className.includes(query);
  });

  const stats = {
    total: filteredEnrollments.length,
    paid: filteredEnrollments.filter(e => e.payment_status === 'PAID').length,
    partial: filteredEnrollments.filter(e => e.payment_status === 'PARTIAL').length,
    unpaid: filteredEnrollments.filter(e => e.payment_status === 'UNPAID').length,
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
            <H1 color={colors.foreground} fontWeight="800">Inscriptions</H1>
            <SizableText color={colors.mutedForeground} size="$4">
              {stats.total} élève(s) dans mes classes
            </SizableText>
          </YStack>
        </XStack>

        {/* Stats */}
        <XStack gap="$2" flexWrap="wrap">
          <Card flex={1} minWidth={70} backgroundColor={colors.success + '18'} borderRadius="$4" padding="$3" alignItems="center">
            <SizableText color={colors.success} size="$2">Payé</SizableText>
            <H2 color={colors.success}>{stats.paid}</H2>
          </Card>
          <Card flex={1} minWidth={70} backgroundColor={colors.warning + '18'} borderRadius="$4" padding="$3" alignItems="center">
            <SizableText color={colors.warning} size="$2">Partiel</SizableText>
            <H2 color={colors.warning}>{stats.partial}</H2>
          </Card>
          <Card flex={1} minWidth={70} backgroundColor={colors.destructive + '18'} borderRadius="$4" padding="$3" alignItems="center">
            <SizableText color={colors.destructive} size="$2">Non payé</SizableText>
            <H2 color={colors.destructive}>{stats.unpaid}</H2>
          </Card>
        </XStack>

        {/* Search and Filters */}
        <YStack gap="$2">
          <XStack gap="$2">
            <XStack flex={1} gap="$2" backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$3" paddingHorizontal="$3" alignItems="center">
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher un élève..."
                color={colors.foreground}
                backgroundColor="transparent"
                borderWidth={0}
                flex={1}
              />
            </XStack>
          </XStack>
          
          <XStack gap="$2" flexWrap="wrap">
            {[
              { key: 'ALL', label: 'Tous' },
              { key: 'PAID', label: 'Payé' },
              { key: 'PARTIAL', label: 'Partiel' },
              { key: 'UNPAID', label: 'Non payé' },
            ].map(filter => (
              <Button
                key={filter.key}
                height={36}
                paddingHorizontal="$3"
                backgroundColor={statusFilter === filter.key ? colors.accent : colors.card}
                color={statusFilter === filter.key ? colors.accentForeground : colors.foreground}
                borderColor={colors.border}
                borderWidth={1}
                borderRadius="$3"
                onPress={() => { tapFeedback(); setStatusFilter(filter.key); }}
              >
                <SizableText size="$2" fontWeight="700">{filter.label}</SizableText>
              </Button>
            ))}
          </XStack>
        </YStack>

        {/* Enrollments List */}
        <Card backgroundColor={colors.card} borderColor={colors.border} borderWidth={1} borderRadius="$5" padding="$3" gap="$2">
          {enrollmentsLoading || studentsLoading || classesLoading ? (
            <YStack alignItems="center" justifyContent="center" padding="$6">
              <ActivityIndicator size="large" color={colors.accent} />
              <SizableText color={colors.mutedForeground} marginTop="$3">Chargement des inscriptions…</SizableText>
            </YStack>
          ) : filteredEnrollments.length === 0 ? (
            <YStack alignItems="center" justifyContent="center" padding="$6" gap="$2">
              <Users size={48} color={colors.mutedForeground} />
              <SizableText color={colors.mutedForeground} textAlign="center" size="$3">
                {searchQuery ? 'Aucun résultat' : 'Aucune inscription dans vos classes'}
              </SizableText>
            </YStack>
          ) : (
            filteredEnrollments.map(enrollment => (
              <EnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                onConfirmPayment={(id) => {
                  // Teachers can view but not confirm payments
                  alert('Seul l\'administration peut confirmer les paiements.');
                }}
              />
            ))
          )}
        </Card>
      </YStack>
    </ScrollView>
  );
}