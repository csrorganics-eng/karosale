import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Share } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";
import { useAuthStore } from "@/stores/auth-store";
import { getApiOrigin } from "@/constants/config";

export default function LoyaltyScreen() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);

  const { data, isLoading } = useQuery({
    queryKey: ["loyalty"],
    queryFn: () => shopApi.loyaltySummary(),
    enabled: !!user,
  });

  if (ready && !user) {
    router.replace({ pathname: "/(auth)/login", params: { redirect: "/loyalty" } });
    return null;
  }

  const shareReferral = async () => {
    if (!data?.referralCode) return;
    const origin = getApiOrigin().replace(/\/$/, "");
    const url = `${origin}/r/${data.referralCode}`;
    await Share.share({ message: `Shop organic with CSR Organics: ${url}` });
  };

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Karma Rewards" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Karma Rewards" />
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Your Karma balance</Text>
          <Text style={styles.points}>{data?.karmaPoints ?? 0}</Text>
          <Text style={styles.heroSub}>100 points = ₹10 off · Redeem up to 50% per order</Text>
          {data?.tier ? (
            <View style={styles.tier}>
              <Text style={styles.tierText}>{data.tier.name} tier</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.section}>How it works</Text>
        <Text style={styles.copy}>Earn 1 Karma point for every ₹10 spent. Use points at checkout for instant savings on organic essentials.</Text>

        {data?.referralCode ? (
          <View style={styles.refCard}>
            <Text style={styles.refTitle}>Refer friends</Text>
            <Text style={styles.refCode}>{data.referralCode}</Text>
            <Button label="Share invite link" onPress={() => void shareReferral()} variant="outline" />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.card,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  heroLabel: { color: theme.colors.primaryMuted, fontWeight: "600", letterSpacing: 1, fontSize: 12 },
  points: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 48, color: "#fff", marginVertical: 8 },
  heroSub: { color: theme.colors.primaryFg, textAlign: "center", opacity: 0.9, lineHeight: 20 },
  tier: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tierText: { color: "#fff", fontWeight: "700" },
  section: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 8 },
  copy: { color: theme.colors.textMuted, lineHeight: 22, marginBottom: 20 },
  refCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  refTitle: { fontWeight: "700", fontSize: 16 },
  refCode: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, color: theme.colors.primary },
});
