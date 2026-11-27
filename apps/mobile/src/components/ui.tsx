import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Theme } from '@/constants/theme';

export function Screen({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.screen}>{children}</SafeAreaView>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={Theme.colors.muted}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[variant], disabled && styles.disabled]}
      activeOpacity={0.85}
    >
      <Text style={[styles.buttonLabel, variant !== 'primary' && styles.buttonLabelGhost]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return children ? <Text style={styles.error}>{children}</Text> : null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  title: {
    color: Theme.colors.text,
    ...Theme.font.title,
  },
  muted: {
    color: Theme.colors.muted,
    ...Theme.font.body,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  input: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    color: Theme.colors.text,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    ...Theme.font.body,
  },
  button: {
    borderRadius: Theme.radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: Theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Theme.colors.danger,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#FFFFFF',
    ...Theme.font.subtitle,
  },
  buttonLabelGhost: {
    color: Theme.colors.primary,
  },
  error: {
    color: Theme.colors.danger,
    ...Theme.font.small,
  },
});
