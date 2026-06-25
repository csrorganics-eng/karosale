import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";
import { useAuthStore } from "@/stores/auth-store";

function MenuRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.menuBody}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const ready = useAuthStore((s) => s.ready);

  const { data: loyalty } = useQuery({
    queryKey: ["loyalty"],
    queryFn: () => shopApi.loyaltySummary(),
    enabled: !!user,
  });

  if (!ready) return null;

  if (!user) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Account" showSearch={false} />
        <View style={styles.guest}>
          <Text style={styles.guestTitle}>Welcome to CSR Organics</Text>
          <Text style={styles.guestSub}>Sign in to track orders, earn Karma rewards, and save your favourites.</Text>
          <Button label="Sign in" onPress={() => router.push("/(auth)/login")} variant="warm" />
          <Pressable onPress={() => router.push("/(auth)/register")} style={{ marginTop: 16 }}>
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Account" showSearch={false} />
      <ScrollView contentContainerStyle={styles.pad}>
        <LinearGradient colors={[theme.colors.primary, "#2d6b52"]} style={styles.profileCard}>
          <Text style={styles.profileName}>{user.name ?? "Shopper"}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {loyalty ? (
            <Pressable style={styles.karmaChip} onPress={() => router.push("/loyalty")}>
              <Text style={styles.karmaText}>✨ {loyalty.karmaPoints} Karma · {loyalty.tier?.name ?? "Member"}</Text>
            </Pressable>
          ) : null}
        </LinearGradient>

        <View style={styles.menu}>
          <MenuRow icon="receipt-outline" label="My orders" subtitle="Track & reorder" onPress={() => router.push("/orders")} />
          <MenuRow icon="heart-outline" label="Wishlist" onPress={() => router.push("/wishlist")} />
          <MenuRow icon="location-outline" label="Addresses" onPress={() => router.push("/addresses")} />
          <MenuRow icon="repeat-outline" label="Subscriptions" onPress={() => router.push("/subscriptions")} />
          <MenuRow icon="sparkles-outline" label="Karma Rewards" onPress={() => router.push("/loyalty")} />
          <MenuRow icon="grid-outline" label="Categories" onPress={() => router.push("/categories")} />
        </View>

        <Button label="Sign out" onPress={() => void logout()} variant="outline" style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: 16, paddingBottom: 40 },
  guest: { flex: 1, padding: 24, justifyContent: "center" },
  guestTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, marginBottom: 10 },
  guestSub: { color: theme.colors.textMuted, lineHeight: 22, marginBottom: 24 },
  link: { color: theme.colors.primary, textAlign: "center", fontWeight: "700" },
  profileCard: { borderRadius: theme.radius.card, padding: 24, marginBottom: 20 },
  profileName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, color: "#fff" },
  profileEmail: { color: theme.colors.primaryMuted, marginTop: 4 },
  karmaChip: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  karmaText: { color: "#fff", fontWeight: "600" },
  menu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  menuSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});
