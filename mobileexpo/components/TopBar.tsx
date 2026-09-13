import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, SizableText } from '@blinkdotnew/mobile-ui';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import { spacing } from '@/lib/responsive';

type TopBarProps = {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcons?: React.ReactNode[];
  onLeftPress?: () => void;
};

export function TopBar({ title, subtitle, leftIcon, rightIcons = [], onLeftPress }: TopBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <XStack
      backgroundColor={colors.background}
      paddingTop={insets.top + spacing.sm}
      paddingBottom={spacing.md}
      paddingHorizontal={spacing.lg}
      alignItems="center"
      gap={spacing.md}
      borderBottomWidth={1}
      borderColor={colors.border + '60'}
    >
      {leftIcon && (
        <Pressable
          onPress={onLeftPress}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
          }}
          hitSlop={8}
        >
          {leftIcon}
        </Pressable>
      )}
      <YStack flex={1}>
        <SizableText
          color={colors.foreground}
          fontWeight="800"
          size={18}
          numberOfLines={1}
        >
          {title}
        </SizableText>
        {subtitle && (
          <SizableText color={colors.mutedForeground} size={12} numberOfLines={1}>
            {subtitle}
          </SizableText>
        )}
      </YStack>
      <XStack gap={spacing.sm}>
        {rightIcons.map((icon, i) => (
          <View key={i}>{icon}</View>
        ))}
      </XStack>
    </XStack>
  );
}
