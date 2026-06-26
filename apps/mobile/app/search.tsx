import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProductCard } from "@/components/commerce/ProductCard";
import { Input } from "@/components/ui";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";

const CARD_W = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

export default function SearchScreen() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: auto-trigger 500ms after user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQ(inputValue.trim());
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputValue]);

  // Also allow immediate search on keyboard submit
  const triggerSearch = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setDebouncedQ(inputValue.trim());
  };

  const { data, isFetching } = useQuery({
    queryKey: ["search", debouncedQ],
    queryFn: () => shopApi.search(debouncedQ),
    enabled: debouncedQ.length >= 2,
  });

  const showResults = debouncedQ.length >= 2;
  const showHint = inputValue.length < 2 && debouncedQ.length < 2;
  const showEmpty = showResults && !isFetching && (data?.results ?? []).length === 0;

  return (
    <View style={styles.flex}>
      <AppHeader title="Search" showSearch={false} />

      {/* Search bar row */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.colors.textMuted}
            style={styles.searchIcon}
          />
          <Input
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Search organic products…"
            returnKeyType="search"
            onSubmitEditing={triggerSearch}
            autoCapitalize="none"
            style={styles.inputInner}
          />
          {isFetching ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.loader}
            />
          ) : inputValue.length > 0 ? (
            <Pressable
              onPress={() => {
                setInputValue("");
                setDebouncedQ("");
              }}
              hitSlop={10}
              style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Explicit search button — important for Android */}
        <Pressable
          style={[styles.searchBtn, inputValue.trim().length < 2 && styles.searchBtnDisabled]}
          onPress={triggerSearch}
          disabled={inputValue.trim().length < 2}
          android_ripple={{ color: theme.colors.accent, borderless: false }}>
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      <FlatList
        data={data?.results ?? []}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          showEmpty ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.empty}>No products match "{debouncedQ}"</Text>
              <Text style={styles.hint}>Try a different keyword</Text>
            </View>
          ) : showHint ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🌿</Text>
              <Text style={styles.hint}>
                Type a product name and tap Search (or press ↵ on your keyboard)
              </Text>
            </View>
          ) : isFetching ? null : null
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

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  inputInner: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 10,
    fontSize: 15,
  },
  loader: { marginLeft: 6 },
  clearBtn: { padding: 4 },

  searchBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: theme.radius.button,
  },
  searchBtnDisabled: { opacity: 0.45 },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },

  emptyWrap: { alignItems: "center", marginTop: 48, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  empty: { fontWeight: "700", fontSize: 16, color: theme.colors.text, textAlign: "center" },
  hint: {
    textAlign: "center",
    color: theme.colors.textMuted,
    marginTop: 6,
    lineHeight: 22,
  },
});
