import { StyleSheet, Text, View } from "react-native";
import { formatInr } from "@/constants/config";
import { getProductOfferDisplay } from "@/lib/offer";
import { theme } from "@/constants/theme";
import { Badge } from "@/components/ui";

export function PriceDisplay({
  price,
  comparePrice,
  promotionalDiscountPct,
  size = "md",
}: {
  price: string | number;
  comparePrice?: string | null;
  promotionalDiscountPct?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const p = typeof price === "string" ? parseFloat(price) : price;
  const { mrp, salePct } = getProductOfferDisplay(p, comparePrice, promotionalDiscountPct);
  const priceSize = size === "lg" ? 24 : size === "sm" ? 15 : 18;

  return (
    <View style={styles.row}>
      <Text style={[styles.price, { fontSize: priceSize }]}>{formatInr(p)}</Text>
      {mrp != null && mrp > p ? (
        <Text style={styles.mrp}>{formatInr(mrp)}</Text>
      ) : null}
      {salePct != null && salePct > 0 ? <Badge label={`${salePct}% off`} tone="sale" /> : null}
    </View>
  );
}

export function RatingStars({ rating, count }: { rating?: string | number; count?: number }) {
  const r = typeof rating === "string" ? parseFloat(rating) : (rating ?? 0);
  if (!r || r <= 0) return null;
  const stars = "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.stars}>{stars.slice(0, 5)}</Text>
      {count ? <Text style={styles.count}>({count})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  price: { fontFamily: "JetBrainsMono", fontWeight: "700", color: theme.colors.primary },
  mrp: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textDecorationLine: "line-through",
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  stars: { color: "#f59e0b", fontSize: 12, letterSpacing: 1 },
  count: { fontSize: 12, color: theme.colors.textMuted },
});
