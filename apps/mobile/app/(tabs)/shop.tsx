import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View as RNView,
} from "react-native";
import { useRouter } from "expo-router";

import { Text, View } from "@/components/Themed";
import { fetchProductList, type ProductCard } from "@/lib/api";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

function formatInr(price: string): string {
  const n = Number(price);
  if (Number.isNaN(n)) return `₹${price}`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ShopScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const [items, setItems] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchProductList({ page: 1, limit: 30, sort: "newest" });
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors[scheme].tint} />
        <Text style={styles.hint}>Loading catalog…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Could not load products</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable onPress={() => void load()} style={[styles.retry, { backgroundColor: Colors[scheme].tint }]}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <RNView style={styles.flex}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Text style={styles.listHeader}>Latest products</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            onPress={() => router.push(`/product/${item.slug}`)}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <RNView style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
            <RNView style={styles.cardBody}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.price}>{formatInr(item.price)}</Text>
              {item.stockQty <= 0 ? (
                <Text style={styles.out}>Out of stock</Text>
              ) : null}
            </RNView>
          </Pressable>
        )}
      />
    </RNView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  hint: { marginTop: 12, opacity: 0.7 },
  errorTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  errorBody: { textAlign: "center", opacity: 0.8, marginBottom: 20 },
  retry: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  retryText: { color: "#fff", fontWeight: "600" },
  list: { padding: 16, paddingBottom: 32 },
  listHeader: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  card: {
    flexDirection: "row",
    marginBottom: 14,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  thumb: { width: 96, height: 96, backgroundColor: "#e2e8f0" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  price: { fontSize: 15, fontWeight: "700", color: "#15803d" },
  out: { marginTop: 4, fontSize: 12, color: "#b91c1c" },
});
