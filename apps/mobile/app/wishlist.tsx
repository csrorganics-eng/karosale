import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
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
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui";
import { formatInr } from "@/constants/config";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";
import { useAuthStore } from "@/stores/auth-store";

export default function WishlistScreen() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => shopApi.wishlist(),
    enabled: !!user,
  });

  const addToCart = useMutation({
    mutationFn: (productId: string) => shopApi.addToCart(productId, 1),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const remove = useMutation({
    mutationFn: (productId: string) => shopApi.toggleWishlist(productId, false),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  return (
    <View style={styles.flex}>
      <AppHeader title="Wishlist" showSearch={false} />
      {!user ? (
        <View style={styles.guest}>
          <Text style={styles.guestEmoji}>❤️</Text>
          <Text style={styles.guestTitle}>Save your favourites</Text>
          <Text style={styles.guestSub}>
            Sign in to view and manage your wishlist across devices.
          </Text>
          <Button
            label="Sign in"
            onPress={() => router.push({ pathname: "/(auth)/login", params: { redirect: "/wishlist" } })}
            variant="warm"
            style={{ marginTop: 20 }}
          />
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🌿</Text>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptySub}>
                Tap the heart on any product to save it here.
              </Text>
              <Button
                label="Browse shop"
                onPress={() => router.push("/(tabs)/shop")}
                variant="outline"
                style={{ marginTop: 20 }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/product/${item.slug}`)}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Text style={{ fontSize: 24 }}>🌿</Text>
                </View>
              )}
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.price}>{formatInr(item.price)}</Text>
                <View style={styles.actions}>
                  <Button
                    label="Add to bag"
                    onPress={() => addToCart.mutate(item.productId)}
                    loading={addToCart.isPending}
                    style={styles.addBtn}
                  />
                  <Pressable
                    onPress={() => remove.mutate(item.productId)}
                    style={styles.removeBtn}
                    accessibilityLabel="Remove from wishlist">
                    <Ionicons name="heart" size={22} color={theme.colors.sale} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  guest: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  guestEmoji: { fontSize: 52 },
  guestTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    marginTop: 12,
    color: theme.colors.text,
  },
  guestSub: {
    textAlign: "center",
    color: theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 22,
  },
  list: { padding: 16, paddingBottom: 32 },
  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, marginTop: 12 },
  emptySub: { textAlign: "center", color: theme.colors.textMuted, marginTop: 8, lineHeight: 22 },
  card: {
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
  price: {
    color: theme.colors.primary,
    fontWeight: "800",
    fontSize: 16,
    marginTop: 4,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  addBtn: { flex: 1, paddingVertical: 8 },
  removeBtn: { padding: 8 },
});
