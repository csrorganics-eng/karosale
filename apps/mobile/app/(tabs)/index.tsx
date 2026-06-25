import {
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef } from "react";
import { ProductCard } from "@/components/commerce/ProductCard";
import { PriceDisplay } from "@/components/commerce/PriceDisplay";
import { formatInr, BRAND_NAME } from "@/constants/config";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";
import { useAuthStore } from "@/stores/auth-store";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - 16 * 2 - 12) / 2;
const HSCROLL_CARD_W = W * 0.68;
const HERO_H = 320;
const HEADER_OPAQUE_THRESHOLD = HERO_H - 80;

// ─── Floating scroll-aware header ────────────────────────────────────────────
function FloatingHeader({
  scrollY,
  cartCount,
  insetTop,
}: {
  scrollY: Animated.Value;
  cartCount: number;
  insetTop: number;
}) {
  const router = useRouter();
  const bgOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 100, HERO_H - 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 60, HERO_H],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={[fh.outer, { paddingTop: insetTop }]} pointerEvents="box-none">
      {/* Blur + white tinted background that fades in on scroll */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surface }]} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(250,251,249,0.92)" }]} />
      </Animated.View>

      {/* Bottom border visible when opaque */}
      <Animated.View style={[fh.border, { opacity: bgOpacity }]} />

      <View style={fh.row}>
        {/* Brand — fades in when opaque */}
        <Animated.Text style={[fh.brand, { opacity: titleOpacity }]} numberOfLines={1}>
          {BRAND_NAME}
        </Animated.Text>

        <View style={fh.actions}>
          <Pressable
            onPress={() => router.push("/search")}
            style={fh.iconBtn}
            accessibilityLabel="Search">
            <Ionicons name="search-outline" size={22} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={fh.iconBtn}
            accessibilityLabel={`Cart, ${cartCount} items`}>
            <Ionicons name="bag-outline" size={22} color={theme.colors.text} />
            {cartCount > 0 && (
              <View style={fh.badge}>
                <Text style={fh.badgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const fh = StyleSheet.create({
  outer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  border: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  brand: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    color: theme.colors.primary,
    flex: 1,
  },
  actions: { flexDirection: "row", gap: 2 },
  iconBtn: { padding: 8, position: "relative" },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.accentWarm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});

// ─── Section header with optional "See all" link ─────────────────────────────
function SectionHead({
  title,
  subtitle,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={sh.row}>
      <View style={sh.left}>
        <Text style={sh.title}>{title}</Text>
        {subtitle ? <Text style={sh.sub}>{subtitle}</Text> : null}
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={sh.seeAll}>See all →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  left: { flex: 1, gap: 2 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: theme.colors.text,
    lineHeight: 28,
  },
  sub: { fontSize: 13, color: theme.colors.textMuted },
  seeAll: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
    paddingLeft: 12,
    paddingBottom: 2,
  },
});

// ─── Compact horizontal product card ─────────────────────────────────────────
function HScrollCard({
  id,
  name,
  slug,
  price,
  comparePrice,
  imageUrl,
  categoryName,
  isBestseller,
  inCartQty,
}: Parameters<typeof ProductCard>[0] & { inCartQty?: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/product/${slug}`);
      }}
      style={hsc.card}>
      <View style={hsc.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={hsc.image} contentFit="cover" transition={200} />
        ) : (
          <View style={[hsc.image, hsc.placeholder]}>
            <Text style={{ fontSize: 36 }}>🌿</Text>
          </View>
        )}
        {isBestseller && (
          <View style={hsc.pill}>
            <Text style={hsc.pillText}>Bestseller</Text>
          </View>
        )}
        {inCartQty && inCartQty > 0 ? (
          <View style={hsc.inBag}>
            <Ionicons name="bag-check" size={12} color="#fff" />
            <Text style={hsc.inBagText}>{inCartQty}</Text>
          </View>
        ) : null}
      </View>
      <View style={hsc.body}>
        {categoryName ? <Text style={hsc.cat} numberOfLines={1}>{categoryName}</Text> : null}
        <Text style={hsc.name} numberOfLines={2}>{name}</Text>
        <PriceDisplay price={price} comparePrice={comparePrice} size="sm" />
      </View>
    </Pressable>
  );
}

const hsc = StyleSheet.create({
  card: {
    width: HSCROLL_CARD_W,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    ...theme.shadow.soft,
    marginBottom: 2,
  },
  imageWrap: { width: "100%", aspectRatio: 4 / 3, backgroundColor: theme.colors.surfaceSubtle },
  image: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  pill: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: theme.colors.accentWarm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  inBag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inBagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  body: { padding: 14, gap: 4 },
  cat: { fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  name: { fontSize: 15, fontWeight: "700", color: theme.colors.text, lineHeight: 21 },
});

// ─── Editorial featured card ───────────────────────────────────────────────
function FeaturedCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={fc.wrap}>
      <LinearGradient
        colors={["#1e4d3a", "#2d6b52", "#356147"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={fc.grad}>
        <View style={fc.content}>
          <View style={fc.badge}>
            <Text style={fc.badgeText}>🌿 Monsoon season</Text>
          </View>
          <Text style={fc.headline}>{"Up to 20% off\norganic seeds"}</Text>
          <Text style={fc.sub}>Premium certified seeds for your home garden</Text>
          <View style={fc.cta}>
            <Text style={fc.ctaText}>Shop now</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
          </View>
        </View>
        {/* Decorative circles */}
        <View style={fc.circleL} />
        <View style={fc.circleR} />
      </LinearGradient>
    </Pressable>
  );
}

const fc = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: "hidden",
    ...theme.shadow.medium,
    marginBottom: 2,
  },
  grad: { padding: 24, minHeight: 140, justifyContent: "center", overflow: "hidden" },
  content: { gap: 8, zIndex: 2 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  headline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    lineHeight: 35,
    color: "#fff",
  },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 20 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  ctaText: { fontWeight: "700", fontSize: 14, color: theme.colors.primary },
  circleL: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.06)",
    zIndex: 0,
  },
  circleR: {
    position: "absolute",
    right: 40,
    bottom: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
    zIndex: 0,
  },
});

// ─── Trust strip (minimal, Apple-style) ──────────────────────────────────────
const TRUST_ITEMS = [
  { icon: "leaf-outline" as const, label: "Certified organic" },
  { icon: "bicycle-outline" as const, label: "Pan-India delivery" },
  { icon: "return-down-back-outline" as const, label: "Easy returns" },
  { icon: "star-outline" as const, label: "4.8 ★ rated" },
];

function TrustStrip() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={ts.row}>
      {TRUST_ITEMS.map((t) => (
        <View key={t.label} style={ts.chip}>
          <Ionicons name={t.icon} size={14} color={theme.colors.primary} />
          <Text style={ts.label}>{t.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const ts = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  label: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
});

// ─── Category pills ────────────────────────────────────────────────────────────
function CategoryPills({ categories, onSelect }: {
  categories: { id: string; name: string; slug: string; icon?: string | null }[];
  onSelect: (slug: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={cp.row}>
      {categories.map((c) => (
        <Pressable
          key={c.id}
          style={cp.pill}
          onPress={() => {
            void Haptics.selectionAsync();
            onSelect(c.slug);
          }}>
          {c.icon ? <Text style={cp.icon}>{c.icon}</Text> : null}
          <Text style={cp.label}>{c.name}</Text>
        </Pressable>
      ))}
      <Pressable
        style={[cp.pill, cp.pillAll]}
        onPress={() => onSelect("")}>
        <Ionicons name="grid-outline" size={14} color={theme.colors.primary} />
        <Text style={[cp.label, { color: theme.colors.primary }]}>All</Text>
      </Pressable>
    </ScrollView>
  );
}

const cp = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 8, paddingVertical: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillAll: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.primary + "30",
  },
  icon: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
});

// ─── Main Home Screen ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(/\s+/)[0];
  const scrollY = useRef(new Animated.Value(0)).current;

  const { data, isRefetching, refetch } = useQuery({
    queryKey: ["home"],
    queryFn: () => shopApi.home(),
  });

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: () => shopApi.cart(),
    staleTime: 10_000,
  });
  const cartCount = cart?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
  const inCartMap = new Map((cart?.items ?? []).map((i) => [i.productId, i.qty]));

  const addToCart = useMutation({
    mutationFn: (productId: string) => shopApi.addToCart(productId, 1),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const headerH = insets.top + 54;

  return (
    <View style={s.flex}>
      {/* Floating animated header */}
      <FloatingHeader scrollY={scrollY} cartCount={cartCount} insetTop={insets.top} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#1e4d3a", "#265e47", "#d9ece2"]}
          locations={[0, 0.55, 1]}
          style={[s.hero, { paddingTop: headerH + 20 }]}>
          {/* Header icons overlay in hero (always white) */}
          <View style={[s.heroIconRow, { top: insets.top + 8 }]}>
            <Pressable
              onPress={() => router.push("/search")}
              style={s.heroIconBtn}
              accessibilityLabel="Search">
              <Ionicons name="search-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              style={s.heroIconBtn}
              accessibilityLabel="Cart">
              <Ionicons name="bag-outline" size={22} color="#fff" />
              {cartCount > 0 && (
                <View style={s.heroBadge}>
                  <Text style={s.heroBadgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={s.heroContent}>
            {firstName ? (
              <Text style={s.heroGreeting}>Good {getTimeOfDay()}, {firstName} 👋</Text>
            ) : (
              <Text style={s.heroEyebrow}>CERTIFIED ORGANIC · PAN-INDIA DELIVERY</Text>
            )}
            <Text style={s.heroTitle}>{"Nature's finest,\ndelivered fresh"}</Text>
            <Text style={s.heroSub}>
              Organic seeds, fertilizers & groceries — curated for you
            </Text>

            {/* Inline search tap target */}
            <Pressable
              onPress={() => router.push("/search")}
              style={s.searchBar}
              accessibilityLabel="Search products">
              <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
              <Text style={s.searchPlaceholder}>Search organic products…</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── TRUST STRIP ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <TrustStrip />
        </View>

        {/* ── CATEGORIES ───────────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHead
            title="Shop by category"
            onSeeAll={() => router.push("/categories")}
          />
          <CategoryPills
            categories={data?.categories ?? []}
            onSelect={(slug) =>
              slug
                ? router.push({ pathname: "/(tabs)/shop", params: { category: slug } })
                : router.push("/categories")
            }
          />
        </View>

        {/* ── FEATURED EDITORIAL CARD ───────────────────────────────────── */}
        <View style={s.section}>
          <FeaturedCard onPress={() => router.push("/(tabs)/shop")} />
        </View>

        {/* ── FRESH PICKS (horizontal scroll) ──────────────────────────── */}
        {(data?.bestsellers?.length ?? 0) > 0 && (
          <View style={s.section}>
            <SectionHead
              title="Fresh picks"
              subtitle="Trending this week"
              onSeeAll={() => router.push("/(tabs)/shop")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.hScrollContent}
              decelerationRate="fast"
              snapToInterval={HSCROLL_CARD_W + 12}
              snapToAlignment="start">
              {(data?.bestsellers ?? []).slice(0, 8).map((p) => (
                <HScrollCard key={p.id} {...p} inCartQty={inCartMap.get(p.id)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── HOMEPAGE BANNER ──────────────────────────────────────────── */}
        {data?.banner?.imageUrl ? (
          <View style={[s.section, s.bannerWrap]}>
            <Pressable onPress={() => router.push("/(tabs)/shop")} style={s.bannerPress}>
              <Image
                source={{ uri: data.banner.imageUrl }}
                style={s.bannerImg}
                contentFit="cover"
              />
            </Pressable>
          </View>
        ) : null}

        {/* ── CURATED BUNDLES ───────────────────────────────────────────── */}
        {(data?.bundles?.length ?? 0) > 0 && (
          <View style={s.section}>
            <SectionHead
              title="Curated bundles"
              subtitle="Save more with combos"
              onSeeAll={() => router.push("/(tabs)/shop")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.hScrollContent}
              decelerationRate="fast"
              snapToInterval={HSCROLL_CARD_W + 12}
              snapToAlignment="start">
              {(data?.bundles ?? []).map((b) => (
                <Pressable
                  key={b.id}
                  style={s.bundleCard}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/product/${b.slug}`);
                  }}>
                  {b.imageUrl ? (
                    <Image source={{ uri: b.imageUrl }} style={s.bundleImg} contentFit="cover" />
                  ) : (
                    <View style={[s.bundleImg, s.bundlePlaceholder]}>
                      <Text style={{ fontSize: 40 }}>🎁</Text>
                    </View>
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.72)"]}
                    style={s.bundleGrad}>
                    <Text style={s.bundleName} numberOfLines={2}>{b.name}</Text>
                    <Text style={s.bundlePrice}>{formatInr(b.price)}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── BESTSELLERS GRID ──────────────────────────────────────────── */}
        {(data?.bestsellers?.length ?? 0) > 0 && (
          <View style={s.section}>
            <SectionHead
              title="Bestsellers"
              subtitle="Our most loved products"
              onSeeAll={() => router.push("/(tabs)/shop")}
            />
            <View style={s.grid}>
              {(data?.bestsellers ?? []).slice(0, 6).map((p) => (
                <ProductCard key={p.id} {...p} width={CARD_W} inCartQty={inCartMap.get(p.id)} />
              ))}
            </View>
          </View>
        )}

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerDot}>●</Text>
          <Text style={s.footerText}>{BRAND_NAME} · Certified organic marketplace</Text>
          <Text style={s.footerDot}>●</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    position: "relative",
    overflow: "hidden",
  },
  heroIconRow: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 2,
    zIndex: 10,
  },
  heroIconBtn: { padding: 8, position: "relative" },
  heroBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: theme.colors.accentWarm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  heroBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  heroContent: { gap: 8 },
  heroGreeting: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 38,
    lineHeight: 47,
    color: "#fff",
    marginTop: 4,
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.7)",
    maxWidth: 300,
    marginTop: 2,
  },

  // Inline search bar in hero
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 18,
    ...theme.shadow.soft,
  },
  searchPlaceholder: { color: theme.colors.textMuted, fontSize: 15, flex: 1 },

  // Spacing
  section: { marginBottom: 28 },

  // Horizontal scroll
  hScrollContent: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },

  // Banner
  bannerWrap: { paddingHorizontal: 20 },
  bannerPress: { borderRadius: 20, overflow: "hidden", ...theme.shadow.soft },
  bannerImg: { width: "100%", height: 160, borderRadius: 20 },

  // Bundle card (overlaid text on image)
  bundleCard: {
    width: HSCROLL_CARD_W,
    borderRadius: 20,
    overflow: "hidden",
    ...theme.shadow.soft,
    marginBottom: 2,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  bundleImg: { width: "100%", aspectRatio: 4 / 3 },
  bundlePlaceholder: { alignItems: "center", justifyContent: "center" },
  bundleGrad: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingTop: 30,
    gap: 4,
  },
  bundleName: { color: "#fff", fontSize: 15, fontWeight: "700", lineHeight: 20 },
  bundlePrice: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
    justifyContent: "space-between",
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  footerDot: { color: theme.colors.primary + "40", fontSize: 8 },
  footerText: { textAlign: "center", color: theme.colors.textMuted, fontSize: 12 },
});
