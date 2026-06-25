import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Input, Screen } from "@/components/ui";
import { theme } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim() || undefined);
      if (redirect) {
        router.replace(redirect as "/");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      Alert.alert("Registration failed", e instanceof ApiError ? e.message : "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <LinearGradient colors={[theme.colors.accentSoft, theme.colors.background]} style={styles.hero}>
        <Text style={styles.title}>Join CSR Organics</Text>
        <Text style={styles.sub}>Create an account to earn Karma rewards and track every delivery.</Text>
      </LinearGradient>
      <View style={styles.form}>
        <Input value={name} onChangeText={setName} placeholder="Full name (optional)" />
        <Input value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" />
        <Input value={password} onChangeText={setPassword} placeholder="Password (min 8 characters)" secureTextEntry />
        <Button label="Create account" onPress={() => void onSubmit()} loading={loading} variant="warm" />
        <Button
          label="Already have an account? Sign in"
          onPress={() =>
            router.push({
              pathname: "/(auth)/login",
              params: redirect ? { redirect } : {},
            })
          }
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 28, paddingTop: 48 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 32, color: theme.colors.text },
  sub: { marginTop: 10, fontSize: 16, color: theme.colors.textMuted, lineHeight: 22 },
  form: { padding: 24, gap: 12 },
});
