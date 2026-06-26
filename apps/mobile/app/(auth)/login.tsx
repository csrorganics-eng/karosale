import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Input, Screen } from "@/components/ui";
import { theme } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Email required");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Go to the page that required auth, or home
      if (redirect) {
        router.replace(redirect as "/");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof ApiError ? e.message : "Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <LinearGradient colors={[theme.colors.accentSoft, theme.colors.background]} style={styles.hero}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to checkout, track orders, and earn Karma rewards.</Text>
      </LinearGradient>
      <View style={styles.form}>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
        />
        <View>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => void onSubmit()}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>
        <Button label="Sign in" onPress={() => void onSubmit()} loading={loading} variant="warm" />
        <Button
          label="Create an account instead"
          onPress={() =>
            router.push({
              pathname: "/(auth)/register",
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
  forgotWrap: { alignSelf: "flex-end", marginTop: 6 },
  forgotText: { fontSize: 13, color: theme.colors.primary, fontWeight: "600" },
});
