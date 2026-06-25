import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui";
import { PriceDisplay } from "@/components/commerce/PriceDisplay";
import { formatInr } from "@/constants/config";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";
import { useAuthStore } from "@/stores/auth-store";

export default function CartScreen() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => shopApi.cart(),
    // Cart works for guests too — always fetch
    staleTime: 10_000,
  });

  const updateQty = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => shopApi.updateCartItem(id, qty),
    onMutate: async ({ id, qty }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ["cart"] });
      const prev = qc.getQueryData(["cart"]);
      qc.setQueryData(["cart"], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i) => (i.id === id ? { ...i, qty, total: String(parseFloat(i.unitPrice) * qty) } : i)),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["cart"], ctx?.prev),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => shopApi.removeCartItem(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["cart"] });
      const prev = qc.getQueryData(["cart"]);
      qc.setQueryData(["cart"], (old: typeof data) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((i) => i.id !== id) };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["cart"], ctx?.prev),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const subtotal = data?.items.reduce((s, i) => s + parseFloat(i.total), 0) ?? 0;
  const itemCount = data?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
  const coupon = data?.cart.couponCode;

  const goToCheckout = () => {
    if (!data?.items.length) {
      Alert.alert("Your bag is empty", "Browse the shop to add organic essentials.");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      // Pass redirect so user returns here after login
      router.push({ pathname: "/(auth)/login", params: { redirect: "/checkout" } });
      return;
    }
    router.push("/checkout");
  };

  return (
    <View style={styles.flex}>
      <AppHeader title="Your bag" showSearch={false} />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <>
          <FlatList
            data={data?.items ?? []}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🛍️</Text>
                <Text style={styles.emptyTitle}>Your bag is empty</Text>
                <Text style={styles.emptySub}>
                  Discover certified organic products curated for you.
                </Text>
                <Button
                  label="Start shopping"
                  onPress={() => router.push("/(tabs)/shop")}
                  variant="warm"
                  style={{ marginTop: 20 }}
                />
                {!user ? (
                  <Button
                    label="Sign in to see saved cart"
                    onPress={() => router.push("/(auth)/login")}
                    variant="outline"
                    style={{ marginTop: 10 }}
                  />
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Text style={{ fontSize: 28 }}>🌿</Text>
                  </View>
                )}
                <View style={styles.body}>
                  <Pressable onPress={() => router.push(`/product/${item.productSlug}`)}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.productName}
                    </Text>
                  </Pressable>
                  <PriceDisplay price={item.unitPrice} size="sm" />
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() => {
                        void Haptics.selectionAsync();
                        if (item.qty <= 1) {
                          removeItem.mutate(item.id);
                        } else {
                          updateQty.mutate({ id: item.id, qty: item.qty - 1 });
                        }
                      }}
                      style={styles.qtyBtn}>
                      <Ionicons
                        name={item.qty <= 1 ? "trash-outline" : "remove"}
                        size={16}
                        color={item.qty <= 1 ? theme.colors.error : theme.colors.text}
                      />
                    </Pressable>
                    <Text style={styles.qty}>{item.qty}</Text>
                    <Pressable
                      onPress={() => {
                        if (item.qty >= item.stockQty) {
                          Alert.alert("Stock limit reached");
                          return;
                        }
                        void Haptics.selectionAsync();
                        updateQty.mutate({ id: item.id, qty: item.qty + 1 });
                      }}
                      style={styles.qtyBtn}>
                      <Ionicons name="add" size={16} color={theme.colors.text} />
                    </Pressable>
                    <Text style={styles.lineTotal}>{formatInr(item.total)}</Text>
                  </View>
                </View>
              </View>
            )}
          />

          {(data?.items.length ?? 0) > 0 ? (
            <LinearGradient
              colors={[theme.colors.surface + "00", theme.colors.surface]}
              style={styles.footerGrad}
              pointerEvents="none"
            />
          ) : null}

          {(data?.items.length ?? 0) > 0 ? (
            <View style={styles.footer}>
              {coupon ? (
                <Text style={styles.coupon}>🎉 Coupon &ldquo;{coupon}&rdquo; applied</Text>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Subtotal · {itemCount} {itemCount === 1 ? "item" : "items"}
                </Text>
                <Text style={styles.totalVal}>{formatInr(subtotal)}</Text>
              </View>
              <Text style={styles.shipNote}>Shipping & Karma rewards calculated at checkout</Text>
              <Button
                label={user ? "Proceed to checkout →" : "Sign in to checkout →"}
                onPress={goToCheckout}
                variant="warm"
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 220 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: theme.colors.text,
  },
  emptySub: {
    textAlign: "center",
    color: theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  thumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmpty: {},
  body: { flex: 1, marginLeft: 14, justifyContent: "space-between" },
  name: { fontWeight: "600", fontSize: 15, color: theme.colors.text, lineHeight: 20 },
  qtyRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qty: { fontWeight: "800", fontSize: 16, minWidth: 28, textAlign: "center", color: theme.colors.text },
  lineTotal: { marginLeft: "auto", fontWeight: "700", color: theme.colors.primary },
  footerGrad: {
    position: "absolute",
    bottom: 160,
    left: 0,
    right: 0,
    height: 40,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadow.medium,
  },
  coupon: { color: theme.colors.success, fontWeight: "600", marginBottom: 8, fontSize: 13 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  totalLabel: { fontSize: 15, color: theme.colors.textMuted },
  totalVal: { fontSize: 22, fontWeight: "800", color: theme.colors.primary },
  shipNote: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 14 },
});
