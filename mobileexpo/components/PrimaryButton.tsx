import { View, Pressable } from 'react-native';
import { SizableText } from '@blinkdotnew/mobile-ui';
import { useTheme } from '@/lib/theme';
import { spacing, fontSize, iconSize } from '@/lib/responsive';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
}: PrimaryButtonProps) {
  const { colors } = useTheme();

  const getBgColor = () => {
    if (disabled) return colors.muted;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.secondary;
      case 'outline': return 'transparent';
      case 'destructive': return colors.destructive;
      case 'ghost': return 'transparent';
      default: return colors.primary;
    }
  };
  const getTextColor = () => {
    if (disabled) return colors.mutedForeground;
    switch (variant) {
      case 'primary': return colors.primaryForeground;
      case 'secondary': return colors.foreground;
      case 'outline': return colors.primary;
      case 'destructive': return colors.destructiveForeground;
      case 'ghost': return colors.primary;
      default: return colors.primaryForeground;
    }
  };
  const sizes = {
    sm: { height: 38, fontSize: fontSize.sm, padding: spacing.md },
    md: { height: 46, fontSize: fontSize.md, padding: spacing.lg },
    lg: { height: 54, fontSize: fontSize.lg, padding: spacing.xl },
  };
  const s = sizes[size];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        height: s.height,
        paddingHorizontal: s.padding,
        borderRadius: 12,
        backgroundColor: getBgColor(),
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderColor: variant === 'outline' ? colors.primary : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        shadowColor: variant === 'primary' ? colors.primary : 'transparent',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: variant === 'primary' ? 0.3 : 0,
        shadowRadius: 8,
        elevation: variant === 'primary' ? 4 : 0,
      }}
    >
      {icon && <View>{icon}</View>}
      <SizableText
        color={getTextColor()}
        fontWeight="700"
        size={s.fontSize}
        numberOfLines={1}
      >
        {label}
      </SizableText>
    </Pressable>
  );
}
