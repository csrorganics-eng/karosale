import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";
import { ShopChat } from "@/components/chat/ShopChat";

/** Shows the cart item count as a live badge on the tab icon. */
function CartTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const { data } = useQuery({
    queryKey: ["cart"],
    queryFn: () => shopApi.cart(),
    staleTime: 10_000,
  });
  const count = data?.items.reduce((s, i) => s + i.qty, 0) ?? 0;

  return (
    <View style={s.wrap}>
      <Ionicons name={focused ? "bag" : "bag-outline"} size={size} color={color} />
      {count > 0 ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
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
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800", lineHeight: 11 },
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 54 + insets.bottom;
  const [chatOpen, setChatOpen] = useState(false);

  // Position FAB just above the tab bar
  const fabBottom = tabBarHeight + 12;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 6),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: "Shop",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "storefront" : "storefront-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: "Bag",
            tabBarIcon: (props) => <CartTabIcon {...props} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* ── Floating AI chat button ──────────────────────────────── */}
      <Pressable
        style={[fab.btn, { bottom: fabBottom }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setChatOpen(true);
        }}
        accessibilityLabel="Open AI shopping assistant">
        <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
        <Text style={fab.label}>Ask AI</Text>
      </Pressable>

      {/* ── Chat modal ───────────────────────────────────────────── */}
      <ShopChat visible={chatOpen} onClose={() => setChatOpen(false)} />
    </View>
  );
}

const fab = StyleSheet.create({
  btn: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 50,
  },
  label: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
