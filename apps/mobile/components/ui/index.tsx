import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
import { theme } from "@/constants/theme";

type BtnVariant = "primary" | "warm" | "outline" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        v.bg,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.textColor} />
      ) : (
        <Text style={[styles.label, { color: v.textColor }, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const variants = {
  primary: { bg: { backgroundColor: theme.colors.primary }, textColor: theme.colors.primaryFg },
  warm: { bg: { backgroundColor: theme.colors.accentWarm }, textColor: "#fff" },
  outline: {
    bg: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: theme.colors.border },
    textColor: theme.colors.primary,
  },
  ghost: { bg: { backgroundColor: "transparent" }, textColor: theme.colors.primary },
};

export function Badge({
  label,
  tone = "primary",
}: {
  label: string;
  tone?: "primary" | "sale" | "amber" | "success" | "error";
}) {
  const tones = {
    primary: { bg: theme.colors.accent, color: theme.colors.primary },
    sale: { bg: theme.colors.sale, color: "#fff" },
    amber: { bg: "#fef3c7", color: theme.colors.amber },
    success: { bg: "#dcfce7", color: theme.colors.success },
    error: { bg: "#fee2e2", color: theme.colors.error },
  };
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.color }]}>{label}</Text>
    </View>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  multiline?: boolean;
  style?: TextStyle;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[styles.input, multiline && { minHeight: 88, textAlignVertical: "top" as const }, style]}
    />
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  subtitle,
  style,
}: {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.sectionHead, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  sectionHead: { marginBottom: 14, paddingHorizontal: 16 },
  sectionTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: theme.colors.text,
  },
  sectionSub: { marginTop: 4, fontSize: 14, color: theme.colors.textMuted },
});
