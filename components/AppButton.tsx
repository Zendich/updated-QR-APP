import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: 'primary' | 'secondary';
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export default function AppButton({ title, icon, theme = 'secondary', onPress, disabled = false, accessibilityLabel }: Props) {
  const background = theme === 'primary' ? COLORS.primary : COLORS.card;
  const labelColor = theme === 'primary' ? COLORS.textOnPrimary : COLORS.textPrimary;

  return (
    <View style={styles.buttonOuter}>
      <Pressable
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        disabled={disabled}
        hitSlop={8}
        onPress={onPress}
        style={({ pressed: isPressed }) => [
          styles.buttonInner,
          { backgroundColor: isPressed ? (theme === 'primary' ? COLORS.primaryDark : COLORS.surface) : background },
          theme === 'primary' && styles.primaryButton,
          theme === 'secondary' && styles.secondaryButton,
          disabled && styles.disabled,
        ]}
      >
        <Ionicons name={icon} size={21} color={labelColor} style={styles.icon} />
        <Text style={[styles.label, { color: labelColor }]}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    width: '100%',
    marginBottom: 12,
  },
  buttonInner: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButton: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  secondaryButton: {
    borderColor: COLORS.borderStrong,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.52,
  },
  icon: {
    marginRight: 9,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
