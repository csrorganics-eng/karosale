import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { BRAND_NAME } from "@/constants/config";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";

// Local bundled icon — no network required
const LOCAL_ICON = require("@/assets/images/icon.png") as number;

type Props = {
  showSearch?: boolean;
  title?: string;
  showBack?: boolean;
};

export function AppHeader({ showSearch = true, title, showBack = false }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: () => shopApi.cart(),
    staleTime: 10_000,
  });
  const count = cart?.items.reduce((s, i) => s + i.qty, 0) ?? 0;

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
      <View style={styles.row}>
        {/* Left: back button or logo */}
        {showBack ? (
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push("/(tabs)")} style={styles.logoArea}>
            <Image
              source={LOCAL_ICON}
              style={styles.logo}
              contentFit="contain"
            />
            {!title ? (
              <Text style={styles.brand} numberOfLines={1}>
                {BRAND_NAME}
              </Text>
            ) : null}
          </Pressable>
        )}

        {/* Centre: page title (when not home) */}
        {title ? (
          <Text style={styles.pageTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : null}

        {/* Right: actions */}
        <View style={styles.actions}>
          {showSearch ? (
            <Pressable
              onPress={() => router.push("/search")}
              style={styles.iconBtn}
              android_ripple={{ color: theme.colors.accent, radius: 20, borderless: true }}
              accessibilityLabel="Search">
              <Ionicons name="search-outline" size={22} color={theme.colors.text} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={styles.iconBtn}
            android_ripple={{ color: theme.colors.accent, radius: 20, borderless: true }}
            accessibilityLabel={`Cart, ${count} items`}>
            <Ionicons name="bag-outline" size={22} color={theme.colors.text} />
            {count > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 10,
    paddingHorizontal: 16,
    ...theme.shadow.soft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  backBtn: { padding: 4, marginRight: 4 },
  logoArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  logo: { width: 36, height: 36, borderRadius: 8 },
  brand: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    color: theme.colors.primary,
    flexShrink: 1,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 2, alignItems: "center" },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
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
