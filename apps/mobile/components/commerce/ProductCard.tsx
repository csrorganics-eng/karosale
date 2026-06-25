import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { PriceDisplay, RatingStars } from "@/components/commerce/PriceDisplay";
import { Badge } from "@/components/ui";
import { theme } from "@/constants/theme";
import type { ProductCard as ProductCardType } from "@/lib/api/shop";
import { getProductOfferDisplay } from "@/lib/offer";

type Props = ProductCardType & {
  onWishlistPress?: () => void;
  wished?: boolean;
  inCartQty?: number;
  width?: number;
};

export function ProductCard({
  id,
  name,
  slug,
  price,
  comparePrice,
  promotionalDiscountPct,
  imageUrl,
  stockQty,
  lowStockThreshold = 10,
  isOrganicCertified,
  isBestseller,
  avgRating,
  reviewCount,
  categoryName,
  onWishlistPress,
  wished,
  inCartQty,
  width,
}: Props) {
  const router = useRouter();
  const priceNum = parseFloat(price);
  const { salePct } = getProductOfferDisplay(priceNum, comparePrice, promotionalDiscountPct);

  const stockLabel =
    stockQty === 0
      ? { text: "Out of stock", tone: "error" as const }
      : stockQty <= lowStockThreshold
        ? { text: `Low stock (${stockQty})`, tone: "amber" as const }
        : null;

  const open = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product/${slug}`);
  };

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        styles.card,
        width ? { width } : { flex: 1 },
        pressed && { opacity: 0.96, transform: [{ scale: 0.99 }] },
      ]}>
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={{ fontSize: 32 }}>🌿</Text>
          </View>
        )}

        {onWishlistPress ? (
          <Pressable
            style={styles.wishlist}
            onPress={(e) => {
              e.stopPropagation?.();
              void Haptics.selectionAsync();
              onWishlistPress();
            }}
            hitSlop={8}>
            <Ionicons name={wished ? "heart" : "heart-outline"} size={20} color={wished ? theme.colors.sale : theme.colors.text} />
          </Pressable>
        ) : null}

        <View style={styles.badgesTop}>
          {salePct != null && salePct > 0 ? <Badge label={`${salePct}% off`} tone="sale" /> : null}
          {isBestseller ? <Badge label="Bestseller" tone="amber" /> : null}
        </View>

        {inCartQty && inCartQty > 0 ? (
          <View style={styles.inBag}>
            <Text style={styles.inBagText}>{inCartQty} in bag</Text>
          </View>
        ) : null}

        {isOrganicCertified ? (
          <View style={styles.organicBar}>
            <Text style={styles.organicText}>🌿 Organic certified</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {categoryName ? <Text style={styles.cat} numberOfLines={1}>{categoryName}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <RatingStars rating={avgRating ?? undefined} count={reviewCount} />
        <PriceDisplay price={price} comparePrice={comparePrice} promotionalDiscountPct={promotionalDiscountPct} size="sm" />
        {stockLabel ? <Badge label={stockLabel.text} tone={stockLabel.tone} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border + "cc",
    overflow: "hidden",
    ...theme.shadow.soft,
    marginBottom: 12,
  },
  imageWrap: { aspectRatio: 1, backgroundColor: theme.colors.surfaceSubtle },
  image: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  wishlist: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 3,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 8,
    ...theme.shadow.soft,
  },
  badgesTop: { position: "absolute", top: 8, left: 8, gap: 6, zIndex: 2 },
  inBag: {
    position: "absolute",
    top: 44,
    right: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inBagText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  organicBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  organicText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  body: { padding: 12, gap: 6 },
  cat: { fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  name: { fontSize: 15, fontWeight: "600", color: theme.colors.text, lineHeight: 20 },
});
