import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Button, Badge } from "@/components/ui";
import { PriceDisplay, RatingStars } from "@/components/commerce/PriceDisplay";
import { theme } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { shopApi } from "@/lib/api/shop";
import { useAuthStore } from "@/stores/auth-store";
import { getProductOfferDisplay } from "@/lib/offer";
import { getApiOrigin } from "@/constants/config";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => shopApi.product(slug!),
    enabled: !!slug,
  });

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => shopApi.wishlist(),
    enabled: !!user,
  });

  const isWishlisted = wishlist?.items.some((i) => i.productId === data?.product.id) ?? false;

  const toggleWishlist = useMutation({
    mutationFn: () => shopApi.toggleWishlist(data!.product.id, !isWishlisted),
    onSuccess: () => {
      void Haptics.selectionAsync();
      void qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const addToCart = async (buyNow = false) => {
    if (!data?.product) return;
    setAdding(true);
    try {
      await shopApi.addToCart(data.product.id, qty);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["cart"] });
      if (buyNow) {
        if (!user) {
          router.push({ pathname: "/(auth)/login", params: { redirect: "/checkout" } });
        } else {
          router.push("/checkout");
        }
      } else {
        Alert.alert(
          "Added to bag ✓",
          `${qty} × ${data.product.name}`,
          [
            { text: "Continue shopping", style: "cancel" },
            { text: "View bag →", onPress: () => router.push("/(tabs)/cart") },
          ],
        );
      }
    } catch (e) {
      Alert.alert("Could not add", e instanceof ApiError ? e.message : "Please try again");
    } finally {
      setAdding(false);
    }
  };

  const shareProduct = async () => {
    if (!data?.product) return;
    await Share.share({
      message: `${data.product.name} on CSR Organics\n${getApiOrigin()}/products/${slug}`,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.textMuted, textAlign: "center" }}>
          Product not found.{"\n"}It may have been removed or the link is invalid.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>← Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { product, images, category } = data;
  const hero = images[activeImage]?.url ?? images[0]?.url;
  const priceNum = parseFloat(product.price);
  const { salePct } = getProductOfferDisplay(priceNum, product.comparePrice, null);
  const inStock = product.stockQty > 0;

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <Pressable onPress={() => void shareProduct()} style={{ padding: 8 }}>
              <Ionicons name="share-outline" size={22} color={theme.colors.text} />
            </Pressable>
          ),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ padding: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Back</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={[styles.imageWrap, { height: width }]}>
          {hero ? (
            <Image source={{ uri: hero }} style={styles.heroImg} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.heroImg, styles.imagePlaceholder]}>
              <Text style={{ fontSize: 64 }}>🌿</Text>
            </View>
          )}

          {/* Wishlist button */}
          <Pressable
            style={styles.wishBtn}
            onPress={() => {
              if (!user) {
                router.push({ pathname: "/(auth)/login", params: { redirect: `/product/${slug}` } });
                return;
              }
              toggleWishlist.mutate();
            }}
            accessibilityLabel={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}>
            <Ionicons
              name={isWishlisted ? "heart" : "heart-outline"}
              size={22}
              color={isWishlisted ? theme.colors.sale : theme.colors.text}
            />
          </Pressable>

          {/* Sale badge */}
          {salePct && salePct > 0 ? (
            <View style={styles.saleBadge}>
              <Badge label={`${salePct}% off`} tone="sale" />
            </View>
          ) : null}
        </View>

        {/* Thumbnail strip */}
        {images.length > 1 ? (
          <FlatList
            horizontal
            data={images}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.thumbRow}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => setActiveImage(index)}>
                <Image
                  source={{ uri: item.url }}
                  style={[styles.thumb, index === activeImage && styles.thumbActive]}
                  contentFit="cover"
                />
              </Pressable>
            )}
          />
        ) : null}

        <View style={styles.body}>
          {/* Breadcrumb */}
          {category ? (
            <Pressable
              onPress={() => router.push({ pathname: "/(tabs)/shop", params: { category: category.slug } })}
              style={styles.breadcrumb}>
              <Text style={styles.breadcrumbText}>
                Home › {category.name}
              </Text>
            </Pressable>
          ) : null}

          <Text style={styles.productName}>{product.name}</Text>
          <PriceDisplay price={product.price} comparePrice={product.comparePrice} size="lg" />
          <Text style={styles.tax}>Inclusive of all taxes</Text>

          {/* Short description */}
          {product.shortDescription ? (
            <Text style={styles.shortDesc}>{product.shortDescription}</Text>
          ) : null}

          {/* Stock status */}
          <View style={styles.stockRow}>
            {inStock ? (
              <View style={styles.stockPill}>
                <View style={styles.stockDot} />
                <Text style={styles.stockText}>In stock · {product.stockQty} available</Text>
              </View>
            ) : (
              <Badge label="Out of stock" tone="error" />
            )}
          </View>

          {/* Qty stepper */}
          {inStock ? (
            <View style={styles.qtySection}>
              <Text style={styles.qtyLabel}>Quantity</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setQty((q) => Math.max(1, q - 1))}
                  style={[styles.stepBtn, qty <= 1 && styles.stepBtnDisabled]}
                  disabled={qty <= 1}>
                  <Ionicons name="remove" size={18} color={qty <= 1 ? theme.colors.textMuted : theme.colors.text} />
                </Pressable>
                <Text style={styles.qtyVal}>{qty}</Text>
                <Pressable
                  onPress={() => setQty((q) => Math.min(product.stockQty, q + 1))}
                  style={[styles.stepBtn, qty >= product.stockQty && styles.stepBtnDisabled]}
                  disabled={qty >= product.stockQty}>
                  <Ionicons name="add" size={18} color={qty >= product.stockQty ? theme.colors.textMuted : theme.colors.text} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Description */}
          {product.description ? (
            <View style={styles.descBlock}>
              <Text style={styles.descTitle}>About this product</Text>
              <Text style={styles.desc}>{stripHtml(product.description)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky CTA bar */}
      {inStock ? (
        <View style={[styles.ctaBar, Platform.OS === "ios" && styles.ctaBarIos]}>
          <Button
            label="Add to bag"
            onPress={() => void addToCart(false)}
            loading={adding}
            variant="outline"
            style={styles.ctaHalf}
          />
          <Button
            label="Buy now →"
            onPress={() => void addToCart(true)}
            loading={adding}
            variant="warm"
            style={styles.ctaHalf}
          />
        </View>
      ) : (
        <View style={[styles.ctaBar, Platform.OS === "ios" && styles.ctaBarIos]}>
          <Text style={styles.outOfStockNote}>This product is currently out of stock</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  imageWrap: { position: "relative", backgroundColor: theme.colors.surfaceSubtle },
  heroImg: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },

  wishBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.soft,
  },
  saleBadge: { position: "absolute", top: 14, left: 14 },

  thumbRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbActive: { borderColor: theme.colors.primary },

  body: { paddingHorizontal: 20, paddingTop: 8 },
  breadcrumb: { paddingVertical: 8 },
  breadcrumbText: { fontSize: 12, color: theme.colors.textMuted },
  productName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: theme.colors.text,
    lineHeight: 34,
    marginTop: 4,
    marginBottom: 10,
  },
  tax: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, marginBottom: 12 },
  shortDesc: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  stockRow: { marginBottom: 16 },
  stockPill: { flexDirection: "row", alignItems: "center", gap: 8 },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  stockText: { color: theme.colors.success, fontWeight: "600", fontSize: 13 },

  qtySection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    padding: 16,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.card,
  },
  qtyLabel: { fontWeight: "700", fontSize: 16 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepBtnDisabled: { opacity: 0.4 },
  qtyVal: { fontSize: 20, fontWeight: "800", minWidth: 28, textAlign: "center" },

  descBlock: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 16,
  },
  descTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginBottom: 10,
  },
  desc: { fontSize: 15, lineHeight: 26, color: theme.colors.text },

  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadow.medium,
  },
  ctaBarIos: { paddingBottom: 30 },
  ctaHalf: { flex: 1 },
  outOfStockNote: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontWeight: "600",
    flex: 1,
  },
});
