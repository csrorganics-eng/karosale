import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge } from "@/components/ui";
import { formatInr } from "@/constants/config";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";
import { useAuthStore } from "@/stores/auth-store";

function statusTone(status: string): "primary" | "success" | "amber" | "error" {
  const s = status.toLowerCase();
  if (s.includes("deliver")) return "success";
  if (s.includes("cancel")) return "error";
  if (s.includes("ship") || s.includes("pack")) return "amber";
  return "primary";
}

export default function OrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: () => shopApi.orders(1),
    enabled: !!user,
  });

  // Redirect to login if not authenticated
  if (ready && !user) {
    router.replace({ pathname: "/(auth)/login", params: { redirect: "/orders" } });
    return null;
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="My orders" showSearch={false} />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load orders. Please try again.</Text>
        </View>
      ) : (
        <FlatList
          data={data?.orders ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Your organic essentials will show up here after checkout.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: "/orders/[id]", params: { id: item.id } })}>
              <View style={styles.cardTop}>
                <Text style={styles.num}>{item.orderNumber}</Text>
                <Badge label={item.status} tone={statusTone(item.status)} />
              </View>
              <Text style={styles.total}>
                {formatInr(item.total)} · {(item.paymentMethod ?? "").toUpperCase() || "—"}
              </Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: theme.colors.textMuted, textAlign: "center", lineHeight: 22 },
  list: { padding: 16, paddingBottom: 32 },
  emptyWrap: { alignItems: "center", marginTop: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, marginTop: 12 },
  emptySub: { color: theme.colors.textMuted, textAlign: "center", marginTop: 8, lineHeight: 22 },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.card,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  num: { fontWeight: "700", fontSize: 16, flex: 1 },
  total: { color: theme.colors.textMuted, marginTop: 8, fontWeight: "600" },
  date: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
});
