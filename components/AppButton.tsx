import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: 'primary' | 'secondary';
  onPress: () => void;
  disabled?: boolean;
};

export default function AppButton({ title, icon, theme = 'secondary', onPress, disabled = false }: Props) {
  const pressed = theme === 'primary' ? COLORS.primary : COLORS.card;
  const labelColor = theme === 'primary' ? COLORS.textOnPrimary : COLORS.textPrimary;

  return (
    <View style={styles.buttonOuter}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed: isPressed }) => [
          styles.buttonInner,
          { backgroundColor: isPressed ? (theme === 'primary' ? COLORS.primaryDark : COLORS.surface) : pressed },
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  secondaryButton: {
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.55,
  },
  icon: {
    marginRight: 9,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
