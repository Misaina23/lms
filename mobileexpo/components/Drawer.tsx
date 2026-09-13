import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions, Platform, View, Pressable, ScrollView } from 'react-native';
import { YStack, XStack, Text, Card , SizableText} from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { iconSize, spacing, SCREEN_WIDTH, fontSize } from '@/lib/responsive';
import type { TabItem } from './BottomNav';

type DrawerProps<T extends string> = {
  visible: boolean;
  onClose: () => void;
  tabs: TabItem<T>[];
  activeKey: T;
  onSelect: (key: T) => void;
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
  } | null;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
};

export function Drawer<T extends string>({
  visible,
  onClose,
  tabs,
  activeKey,
  onSelect,
  user,
  onLogout,
  onToggleTheme,
  isDark,
}: DrawerProps<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const drawerWidth = Math.min(SCREEN_WIDTH * 0.82, 320);

  if (!visible) return null;

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    PROFESSEUR: 'Professeur',
    ELEVE: 'Élève',
    PARENT: 'Parent',
    SURVEILLANT: 'Surveillant',
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
      }}
      pointerEvents="box-none"
    >
      <Pressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
        onPress={onClose}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: drawerWidth,
          backgroundColor: colors.card,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: spacing.lg,
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 16,
        }}
      >
        <XStack justifyContent="space-between" alignItems="center" marginBottom={spacing.xl}>
          <XStack gap={spacing.sm} alignItems="center">
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SizableText color={colors.primaryForeground} fontWeight="800" size={15}>
                LH
              </SizableText>
            </View>
            <YStack>
              <SizableText color={colors.foreground} fontWeight="800" size={fontSize.lg}>
                Lycée Horizon
              </SizableText>
              <SizableText color={colors.mutedForeground} size={fontSize.xs}>
                Espace enseignant
              </SizableText>
            </YStack>
          </XStack>
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.secondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={8}
          >
            <SizableText color={colors.foreground} size={20} fontWeight="700">×</SizableText>
          </Pressable>
        </XStack>

        {user && (
          <Card
            style={{
              padding: spacing.md,
              borderRadius: 14,
              backgroundColor: colors.secondary,
              marginBottom: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <XStack gap={spacing.md} alignItems="center">
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SizableText color={colors.primaryForeground} fontWeight="800" size={15}>
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </SizableText>
              </View>
              <YStack flex={1}>
                <SizableText color={colors.foreground} fontWeight="700" size={fontSize.md} numberOfLines={1}>
                  {user.first_name} {user.last_name}
                </SizableText>
                <SizableText color={colors.mutedForeground} size={fontSize.xs} numberOfLines={1}>
                  {roleLabels[user.role || ''] || user.role}
                </SizableText>
              </YStack>
            </XStack>
          </Card>
        )}

        <YStack gap={spacing.xs} flex={1}>
          {tabs.map((tab) => {
            const active = activeKey === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  onSelect(tab.key);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: 12,
                  paddingHorizontal: spacing.md,
                  borderRadius: 12,
                  backgroundColor: active ? colors.primary + '15' : 'transparent',
                }}
              >
                {tab.icon({ color: active ? colors.primary : colors.foreground, size: iconSize.md, active })}
                <SizableText
                  color={active ? colors.primary : colors.foreground}
                  fontWeight={active ? '700' : '600'}
                  size={fontSize.md}
                  flex={1}
                >
                  {tab.label}
                </SizableText>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <View
                    style={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      backgroundColor: colors.destructive,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SizableText color={colors.destructiveForeground} size={11} fontWeight="800">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </SizableText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </YStack>

        <YStack gap={spacing.sm}>
          {onToggleTheme && (
            <Pressable
              onPress={onToggleTheme}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: 12,
                paddingHorizontal: spacing.md,
                borderRadius: 12,
                backgroundColor: colors.secondary,
              }}
            >
              <SizableText size={20}>{isDark ? '☀️' : '🌙'}</SizableText>
              <SizableText color={colors.foreground} fontWeight="600" size={fontSize.md} flex={1}>
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </SizableText>
            </Pressable>
          )}
          {onLogout && (
            <Pressable
              onPress={onLogout}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: 12,
                paddingHorizontal: spacing.md,
                borderRadius: 12,
                backgroundColor: colors.destructive + '12',
              }}
            >
              <SizableText size={20}>🚪</SizableText>
              <SizableText color={colors.destructive} fontWeight="700" size={fontSize.md} flex={1}>
                Se déconnecter
              </SizableText>
            </Pressable>
          )}
        </YStack>
      </View>
    </View>
  );
}
