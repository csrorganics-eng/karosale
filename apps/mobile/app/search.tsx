import { useState } from "react";
import { Dimensions, FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProductCard } from "@/components/commerce/ProductCard";
import { Input } from "@/components/ui";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";

const CARD_W = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => shopApi.search(q),
    enabled: q.trim().length >= 2,
  });

  return (
    <View style={styles.flex}>
      <AppHeader title="Search" showSearch={false} />
      <View style={styles.searchPad}>
        <Input value={q} onChangeText={setQ} placeholder="Search organic products…" />
      </View>
      <FlatList
        data={data?.results ?? []}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          q.length >= 2 && !isFetching ? (
            <Text style={styles.empty}>No products match &ldquo;{q}&rdquo;</Text>
          ) : q.length < 2 ? (
            <Text style={styles.hint}>Type at least 2 characters to search</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ProductCard
            {...item}
            stockQty={item.stockQty ?? 99}
            comparePrice={item.comparePrice ?? null}
            shortDescription={item.shortDescription ?? null}
            categoryName={item.categoryName ?? null}
            categorySlug={item.categorySlug ?? null}
            width={CARD_W}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  searchPad: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  empty: { textAlign: "center", color: theme.colors.textMuted, marginTop: 40 },
  hint: { textAlign: "center", color: theme.colors.textMuted, marginTop: 40, paddingHorizontal: 24 },
});
