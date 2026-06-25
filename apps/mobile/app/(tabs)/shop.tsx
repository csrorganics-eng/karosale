import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProductCard } from "@/components/commerce/ProductCard";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - 16 * 2 - 12) / 2;

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "bestsellers", label: "Bestsellers" },
  { id: "price_asc", label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
  { id: "rating", label: "Top rated" },
] as const;

export default function ShopScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("newest");
  const [organicOnly, setOrganicOnly] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["products", category, sort, organicOnly],
    queryFn: () =>
      shopApi.products({
        page: 1,
        limit: 40,
        sort,
        category: typeof category === "string" ? category : undefined,
        isOrganic: organicOnly ? "true" : undefined,
      }),
  });

  const { data: cart } = useQuery({ queryKey: ["cart"], queryFn: () => shopApi.cart() });
  const inCartMap = new Map((cart?.items ?? []).map((i) => [i.productId, i.qty]));

  const title = typeof category === "string"
    ? category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Shop";

  return (
    <View style={styles.flex}>
      <AppHeader title={title} />

      {/* Filter chips */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}>
          {SORTS.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSort(s.id)}
              style={[styles.chip, sort === s.id && styles.chipActive]}>
              <Text style={[styles.chipText, sort === s.id && styles.chipTextActive]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setOrganicOnly((v) => !v)}
            style={[styles.chip, styles.chipOrganic, organicOnly && styles.chipActive]}>
            <Text style={[styles.chipText, organicOnly && styles.chipTextActive]}>
              🌿 Organic only
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.loadText}>Loading products…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.loadText}>Could not load products. Pull down to retry.</Text>
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.col}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard {...item} width={CARD_W} inCartQty={inCartMap.get(item.id)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  filterBar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipOrganic: {
    borderColor: theme.colors.primary + "40",
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },
  chipTextActive: { color: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadText: { color: theme.colors.textMuted, fontSize: 14 },
  list: { padding: 16, paddingBottom: 32 },
  col: { justifyContent: "space-between", marginBottom: 0 },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginTop: 12 },
  emptyText: { color: theme.colors.textMuted, marginTop: 6 },
});
