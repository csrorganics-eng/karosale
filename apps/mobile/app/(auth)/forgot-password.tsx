import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { theme } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { shopApi } from "@/lib/api/shop";

type Step = "email" | "verify";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Refs for the 6 OTP digit inputs
  const digitRefs = useRef<(TextInput | null)[]>([]);

  // ── Step 1: Request OTP ────────────────────────────────────────────
  const requestOtp = async () => {
    if (!email.trim().includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await shopApi.forgotPassword(email.trim().toLowerCase());
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setStep("verify");
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Account not found — show same message to avoid enumeration
        setStep("verify");
        setResetToken("__no_account__");
      }
    } catch (e) {
      Alert.alert(
        "Could not send code",
        e instanceof ApiError ? e.message : "Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP + set new password ─────────────────────────
  const resetPassword = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      Alert.alert("Enter the 6-digit code", "Please enter all 6 digits from your email.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Password too short", "Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please make sure both password fields are the same.");
      return;
    }

    setLoading(true);
    try {
      await shopApi.resetPassword(resetToken, fullCode, newPassword);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Password reset! ✓",
        "Your password has been updated. Please sign in with your new password.",
        [{ text: "Sign in", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (e) {
      Alert.alert(
        "Reset failed",
        e instanceof ApiError ? e.message : "Please try again or request a new code.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle each OTP digit input
  const handleDigitChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = cleaned;
    setCode(next);
    // Auto-advance to next digit
    if (cleaned && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={[theme.colors.accentSoft, theme.colors.background]}
          style={styles.hero}>
          <Text style={styles.title}>
            {step === "email" ? "Forgot password?" : "Check your email"}
          </Text>
          <Text style={styles.sub}>
            {step === "email"
              ? "Enter your email and we'll send you a 6-digit code to reset your password."
              : `We sent a 6-digit code to ${email}. Enter it below along with your new password.`}
          </Text>
        </LinearGradient>

        <View style={styles.form}>
          {step === "email" ? (
            <>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={() => void requestOtp()}
                autoCapitalize="none"
              />
              <Button
                label="Send reset code"
                onPress={() => void requestOtp()}
                loading={loading}
                variant="warm"
              />
              <Button
                label="← Back to sign in"
                onPress={() => router.back()}
                variant="ghost"
              />
            </>
          ) : (
            <>
              {/* 6-digit OTP input */}
              <Text style={styles.label}>Enter the 6-digit code</Text>
              <View style={styles.otpRow}>
                {code.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => {
                      digitRefs.current[i] = r;
                    }}
                    style={[styles.otpBox, digit && styles.otpBoxFilled]}
                    value={digit}
                    onChangeText={(t) => handleDigitChange(t, i)}
                    onKeyPress={({ nativeEvent }) => handleDigitKeyPress(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    textContentType="oneTimeCode"
                  />
                ))}
              </View>

              {/* New password */}
              <Text style={[styles.label, { marginTop: 20 }]}>New password</Text>
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                returnKeyType="next"
                autoCapitalize="none"
              />
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={() => void resetPassword()}
                autoCapitalize="none"
              />

              <Button
                label="Reset password"
                onPress={() => void resetPassword()}
                loading={loading}
                variant="warm"
              />

              {/* Resend option */}
              <View style={styles.resendRow}>
                <Ionicons name="mail-outline" size={14} color={theme.colors.textMuted} />
                <Text style={styles.resendText}>Didn't receive it? </Text>
                <Text
                  style={styles.resendLink}
                  onPress={() => {
                    setStep("email");
                    setCode(["", "", "", "", "", ""]);
                  }}>
                  Resend code
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1 },
  hero: { padding: 28, paddingTop: 56 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
    color: theme.colors.text,
  },
  sub: { marginTop: 10, fontSize: 15, color: theme.colors.textMuted, lineHeight: 22 },
  form: { padding: 24, gap: 12 },
  label: { fontWeight: "700", fontSize: 14, color: theme.colors.text, marginBottom: 4 },

  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  otpBoxFilled: { borderColor: theme.colors.primary, backgroundColor: theme.colors.accentSoft },

  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 4,
  },
  resendText: { fontSize: 13, color: theme.colors.textMuted },
  resendLink: { fontSize: 13, color: theme.colors.primary, fontWeight: "700" },
});
