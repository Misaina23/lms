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
  H2,
  SizableText,
  ChevronRight,
  Bell,
  MessageCircle,
  CalendarDays,
  ClipboardCheck,
  Settings2,
  ShieldCheck,
  CheckCircle2,
} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { api, type Notification } from '@/lib/api';
import * as Haptics from 'expo-haptics';

function tapFeedback() {
  if (typeof Haptics !== 'undefined') Haptics.selectionAsync();
}

const NOTIFICATION_ICONS: Record<string, typeof MessageCircle> = {
  MESSAGE: MessageCircle,
  SCHEDULE: CalendarDays,
  GRADE: ClipboardCheck,
  ATTENDANCE: CheckCircle2,
  SYSTEM: Settings2,
  ADMIN: ShieldCheck,
  DEFAULT: Bell,
};

const NOTIFICATION_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'destructive' | 'accent' | 'info'> = {
  MESSAGE: 'primary',
  SCHEDULE: 'info',
  GRADE: 'warning',
  ATTENDANCE: 'success',
  SYSTEM: 'accent',
  ADMIN: 'destructive',
  DEFAULT: 'primary',
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ results: Notification[] }>('/api/notifications/');
      return res.results || [];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/api/notifications/${id}/`, { status: 'SENT' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications?.filter(n => n.status === 'PENDING').length || 0;

  const getNotificationIcon = (type: string) => {
    return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.DEFAULT;
  };

  const getNotificationColor = (type: string) => {
    return NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.DEFAULT;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <ScrollView flex={1} backgroundColor={colors.background} showsVerticalScrollIndicator={false}>
      <YStack paddingHorizontal="$4" paddingTop={insets.top + 16} paddingBottom="$8" gap="$4">
        {/* Header */}
        <XStack gap="$3" alignItems="center">
          <Button
            circular
            size="$4"
            backgroundColor={colors.card}
            borderWidth={1}
            borderColor={colors.border}
            icon={<ChevronRight size={18} color={colors.foreground} />}
            onPress={() => {}}
            aria-label="Retour"
          />
          <YStack flex={1} gap="$1">
            <H2 color={colors.foreground} fontWeight="800" fontSize={18}>Notifications</H2>
            {unreadCount > 0 && (
              <SizableText color={colors.accent} size="$2" fontWeight="600">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </SizableText>
            )}
          </YStack>
          {unreadCount > 0 && (
            <Button
              size="$3"
              backgroundColor={colors.secondary}
              color={colors.foreground}
              borderRadius="$3"
              onPress={() => {
                tapFeedback();
                notifications?.forEach(n => {
                  if (n.status === 'PENDING') markAsReadMutation.mutate(n.id);
                });
              }}
              disabled={markAsReadMutation.isPending}
            >
              <SizableText size="$2" fontWeight="700">Tout marquer comme lu</SizableText>
            </Button>
          )}
        </XStack>

        {/* Notifications List */}
        {isLoading ? (
          <YStack alignItems="center" justifyContent="center" padding="$6">
            <ActivityIndicator size="large" color={colors.accent} />
            <SizableText color={colors.mutedForeground} marginTop="$3">Chargement des notifications…</SizableText>
          </YStack>
        ) : notifications && notifications.length > 0 ? (
          <YStack gap="$3">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.notification_type);
              const iconColor = colors[getNotificationColor(notification.notification_type)];
              const isUnread = notification.status === 'PENDING';

              return (
                <Card
                  key={notification.id}
                  backgroundColor={isUnread ? colors.card : colors.secondary + '40'}
                  borderWidth={1}
                  borderColor={isUnread ? colors.primary + '40' : colors.border}
                  borderRadius="$4"
                  padding="$4"
                  gap="$3"
                  onPress={() => {
                    tapFeedback();
                    if (isUnread) markAsReadMutation.mutate(notification.id);
                  }}
                >
                  <XStack gap="$3" alignItems="flex-start">
                    <YStack
                      width={40}
                      height={40}
                      borderRadius="$3"
                      backgroundColor={iconColor + '20'}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon size={20} color={iconColor} />
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <XStack justifyContent="space-between" alignItems="center">
                        <SizableText color={colors.foreground} fontWeight="700" size="$3">
                          {notification.title}
                        </SizableText>
                        {isUnread && (
                          <YStack width={8} height={8} borderRadius="$2" backgroundColor={colors.primary} />
                        )}
                      </XStack>
                      <SizableText color={colors.mutedForeground} size="$2" lineHeight={20}>
                        {notification.message}
                      </SizableText>
                      <SizableText color={colors.mutedForeground} size="$1" fontWeight="600">
                        {formatDate(notification.created_at)}
                      </SizableText>
                    </YStack>
                  </XStack>
                </Card>
              );
            })}
          </YStack>
        ) : (
          <YStack alignItems="center" justifyContent="center" padding="$8" gap="$3">
            <YStack
              width={64}
              height={64}
              borderRadius="$4"
              backgroundColor={colors.secondary}
              alignItems="center"
              justifyContent="center"
            >
              <Bell size={32} color={colors.mutedForeground} />
            </YStack>
            <YStack gap="$1" alignItems="center">
              <SizableText color={colors.foreground} fontWeight="700" size="$3">
                Aucune notification
              </SizableText>
              <SizableText color={colors.mutedForeground} size="$2" textAlign="center">
                Vous serez notifié des nouveautés ici
              </SizableText>
            </YStack>
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
