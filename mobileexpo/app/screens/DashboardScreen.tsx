import { useState, useMemo } from 'react';
import { ActivityIndicator, View, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  YStack,
  XStack,
  ScrollView,
  Card,
  H2,
  H3,
  SizableText,
  Text,
  ClipboardCheck,
  UsersRound,
  BookOpen,
  CheckCircle2,
  CalendarDays,
  MessageCircle,
  ChevronRight,
  ArrowUpRight,
  Search,
  GraduationCap,
  Clock3,
  CircleDollarSign,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { spacing, fontSize, iconSize, SCREEN_WIDTH, isTablet } from '@/lib/responsive';
import { PrimaryButton } from '@/components/PrimaryButton';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}
import * as Haptics from 'expo-haptics';

type StatItem = {
  label: string;
  value: string;
  detail: string;
  trend?: string;
  icon: any;
  accentColor: string;
};

function StatCard({ stat, onPress, colors }: { stat: StatItem; onPress?: () => void; colors: any }) {
  const Icon = stat.icon;
  const content = (
    <Card
      style={{
        padding: spacing.md,
        borderRadius: 14,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
        flex: 1,
        minWidth: 0,
      }}
    >
      <XStack justifyContent="space-between" alignItems="flex-start">
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: stat.accentColor + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} color={stat.accentColor} />
        </View>
        {stat.trend && (
          <XStack
            alignItems="center"
            gap={2}
            style={{
              backgroundColor: colors.success + '15',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <ArrowUpRight size={10} color={colors.success} />
            <SizableText color={colors.success} size={10} fontWeight="700">
              {stat.trend}
            </SizableText>
          </XStack>
        )}
      </XStack>
      <YStack gap={2}>
        <SizableText
          color={colors.mutedForeground}
          size={10}
          fontWeight="700"
          letterSpacing={0.5}
        >
          {stat.label.toUpperCase()}
        </SizableText>
        <SizableText color={colors.foreground} fontWeight="800" size={fontSize.xl} numberOfLines={1}>
          {stat.value}
        </SizableText>
        <SizableText color={colors.mutedForeground} size={fontSize.xs} numberOfLines={1}>
          {stat.detail}
        </SizableText>
      </YStack>
    </Card>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={{ flex: 1, minWidth: 0 }}>{content}</Pressable>;
  }
  return content;
}

function QuickAction({ icon, label, onPress, colors }: { icon: any; label: string; onPress: () => void; colors: any }) {
  const Icon = icon;
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{
        flex: 1,
        padding: spacing.md,
        borderRadius: 14,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 0,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={colors.primary} />
      </View>
      <SizableText color={colors.foreground} size={fontSize.xs} fontWeight="600" textAlign="center" numberOfLines={1}>
        {label}
      </SizableText>
    </Pressable>
  );
}

type Props = {
  onNavigate: (tab: string) => void;
};

export default function DashboardScreen({ onNavigate }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<any>('/dashboard/stats/').then((r: any) => r.results || r),
  });

  const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Utilisateur';
  const userInitials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '?';

  const statsList: StatItem[] = useMemo(() => [
    {
      label: 'Mes classes',
      value: stats?.myClasses?.toString() || '5',
      detail: `${stats?.myStudents || 142} élèves`,
      trend: '+2',
      icon: UsersRound,
      accentColor: colors.primary,
    },
    {
      label: 'Notes en attente',
      value: stats?.pendingGrades?.toString() || '8',
      detail: 'À saisir',
      trend: '-3',
      icon: ClipboardCheck,
      accentColor: colors.warning,
    },
    {
      label: 'Présence',
      value: `${stats?.attendanceRate || 92}%`,
      detail: 'Cette semaine',
      trend: '+1.2%',
      icon: CheckCircle2,
      accentColor: colors.success,
    },
    {
      label: 'Mes matières',
      value: stats?.mySubjects?.toString() || '3',
      detail: 'Affectations actives',
      icon: BookOpen,
      accentColor: colors.info,
    },
  ], [stats, colors]);

  if (isLoading && !stats) {
    return (
      <YStack flex={1} backgroundColor={colors.background} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color={colors.primary} />
      </YStack>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refetch();
            setRefreshing(false);
          }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Welcome Card */}
      <Card
        style={{
          padding: spacing.lg,
          borderRadius: 18,
          backgroundColor: colors.primary,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.primaryForeground + '20',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SizableText color={colors.primaryForeground} fontWeight="800" size={20}>
            {userInitials}
          </SizableText>
        </View>
        <YStack flex={1} gap={2}>
          <SizableText color={colors.primaryForeground + 'CC'} size={fontSize.xs} fontWeight="600">
            Bonjour 👋
          </SizableText>
          <SizableText color={colors.primaryForeground} fontWeight="800" size={fontSize.lg} numberOfLines={1}>
            {userName}
          </SizableText>
          <SizableText color={colors.primaryForeground + '99'} size={fontSize.xs}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </SizableText>
        </YStack>
      </Card>

      {/* Quick Actions */}
      <YStack gap={spacing.sm}>
        <SizableText
          color={colors.mutedForeground}
          size={fontSize.xs}
          fontWeight="700"
          letterSpacing={0.5}
        >
          ACTIONS RAPIDES
        </SizableText>
        <XStack gap={spacing.sm}>
          <QuickAction
            icon={ClipboardCheck}
            label="Saisir notes"
            onPress={() => onNavigate('Notes')}
            colors={colors}
          />
          <QuickAction
            icon={CheckCircle2}
            label="Pointer"
            onPress={() => onNavigate('Pointage')}
            colors={colors}
          />
          <QuickAction
            icon={CalendarDays}
            label="Planning"
            onPress={() => onNavigate('Planning')}
            colors={colors}
          />
          <QuickAction
            icon={MessageCircle}
            label="Messages"
            onPress={() => onNavigate('Messages')}
            colors={colors}
          />
        </XStack>
      </YStack>

      {/* Stats Grid */}
      <YStack gap={spacing.sm}>
        <SizableText
          color={colors.mutedForeground}
          size={fontSize.xs}
          fontWeight="700"
          letterSpacing={0.5}
        >
          VUE D'ENSEMBLE
        </SizableText>
        <XStack gap={spacing.sm}>
          <StatCard stat={statsList[0]} colors={colors} />
          <StatCard stat={statsList[1]} colors={colors} />
        </XStack>
        <XStack gap={spacing.sm}>
          <StatCard stat={statsList[2]} colors={colors} />
          <StatCard stat={statsList[3]} colors={colors} />
        </XStack>
      </YStack>

      {/* Today's Schedule */}
      <YStack gap={spacing.sm}>
        <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={spacing.xs}>
          <SizableText
            color={colors.mutedForeground}
            size={fontSize.xs}
            fontWeight="700"
            letterSpacing={0.5}
          >
            AUJOURD'HUI
          </SizableText>
          <Pressable onPress={() => onNavigate('Planning')}>
            <SizableText color={colors.primary} size={fontSize.xs} fontWeight="700">
              Tout voir
            </SizableText>
          </Pressable>
        </XStack>
        <YStack gap={spacing.sm}>
          {[
            { time: '08:00', subject: 'Mathématiques', class: 'Tle C', room: 'Salle 03' },
            { time: '10:00', subject: 'Physique', class: '1ère D', room: 'Lab 02' },
            { time: '14:00', subject: 'Mathématiques', class: '2nde A', room: 'Salle 01' },
          ].map((item, i) => (
            <Pressable
              key={i}
              onPress={() => onNavigate('Planning')}
              style={{
                padding: spacing.md,
                borderRadius: 12,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <YStack
                alignItems="center"
                justifyContent="center"
                style={{
                  width: 50,
                  paddingVertical: spacing.xs,
                  borderRadius: 8,
                  backgroundColor: colors.primary + '12',
                }}
              >
                <SizableText color={colors.primary} fontWeight="800" size={fontSize.sm}>
                  {item.time}
                </SizableText>
              </YStack>
              <YStack flex={1} gap={2}>
                <SizableText color={colors.foreground} fontWeight="700" size={fontSize.sm} numberOfLines={1}>
                  {item.subject}
                </SizableText>
                <XStack gap={spacing.xs} alignItems="center">
                  <SizableText color={colors.mutedForeground} size={fontSize.xs}>{item.class}</SizableText>
                  <SizableText color={colors.mutedForeground} size={fontSize.xs}>·</SizableText>
                  <SizableText color={colors.mutedForeground} size={fontSize.xs}>{item.room}</SizableText>
                </XStack>
              </YStack>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
