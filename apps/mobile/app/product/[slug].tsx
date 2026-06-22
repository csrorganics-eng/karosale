import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { Text, View } from "@/components/Themed";
import { fetchProductBySlug, storefrontUrl, type ProductDetail } from "@/lib/api";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

function formatInr(price: string): string {
  const n = Number(price);
  if (Number.isNaN(n)) return `₹${price}`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const { width } = useWindowDimensions();
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug || typeof slug !== "string") return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetchProductBySlug(slug);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Product" }} />
        <ActivityIndicator size="large" color={Colors[scheme].tint} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Product" }} />
        <Text style={styles.error}>{error ?? "Not found"}</Text>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { product, images, category } = data;
  const hero = images[0]?.url ?? null;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: product.name }} />
      {hero ? (
        <Image source={{ uri: hero }} style={{ width, height: width * 0.85 }} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholder, { width, height: width * 0.5 }]} />
      )}
      <View style={styles.pad}>
        {category ? (
          <Text style={styles.cat}>
            {category.name}
          </Text>
        ) : null}
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.price}>{formatInr(product.price)}</Text>
        {product.shortDescription ? (
          <Text style={styles.short}>{product.shortDescription}</Text>
        ) : null}
        {product.description ? (
          <Text style={styles.desc}>{stripHtml(product.description)}</Text>
        ) : null}

        <Pressable
          style={[styles.cta, { backgroundColor: Colors[scheme].tint }]}
          onPress={() => WebBrowser.openBrowserAsync(storefrontUrl(`/shop/${product.slug}`))}>
          <Text style={styles.ctaText}>Buy on website</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  back: { padding: 12 },
  backText: { color: "#15803d", fontWeight: "600" },
  scroll: { paddingBottom: 40 },
  placeholder: { backgroundColor: "#e2e8f0" },
  pad: { padding: 20 },
  cat: { fontSize: 13, opacity: 0.7, marginBottom: 6, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  price: { fontSize: 20, fontWeight: "700", color: "#15803d", marginBottom: 12 },
  short: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
  desc: { fontSize: 15, lineHeight: 22, opacity: 0.9, marginBottom: 24 },
  cta: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
