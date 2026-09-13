import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack , SizableText} from '@blinkdotnew/mobile-ui';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import { iconSize, spacing } from '@/lib/responsive';

export type TabItem<T extends string> = {
  key: T;
  icon: (props: { color: string; size: number; active: boolean }) => React.ReactNode;
  label: string;
  badge?: number;
};

type BottomNavProps<T extends string> = {
  tabs: TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
};

export function BottomNav<T extends string>({ tabs, activeKey, onChange }: BottomNavProps<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <YStack
      backgroundColor={colors.card}
      borderTopWidth={1}
      borderColor={colors.border}
      paddingBottom={Math.max(insets.bottom, spacing.xs)}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: -2 }}
      shadowOpacity={0.08}
      shadowRadius={6}
      elevation={8}
    >
      <XStack justifyContent="space-around" alignItems="center" paddingVertical={spacing.xs}>
        {tabs.map((tab) => {
          const active = activeKey === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.xs,
              }}
              hitSlop={8}
            >
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: active ? colors.primary + '18' : 'transparent',
                }}
              >
                {tab.icon({ color: active ? colors.primary : colors.mutedForeground, size: iconSize.md, active })}
              </View>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  marginTop: 4,
                  backgroundColor: active ? colors.primary : 'transparent',
                }}
              />
            </Pressable>
          );
        })}
      </XStack>
    </YStack>
  );
}
