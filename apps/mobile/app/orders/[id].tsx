import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Badge } from "@/components/ui";
import { formatInr } from "@/constants/config";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";

function statusTone(status: string): "primary" | "success" | "amber" | "error" {
  const s = status.toLowerCase();
  if (s.includes("deliver")) return "success";
  if (s.includes("cancel")) return "error";
  if (s.includes("ship") || s.includes("pack") || s.includes("transit")) return "amber";
  return "primary";
}

function StatusStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <View style={step.row}>
      <View style={[step.dot, done && step.dotDone, active && step.dotActive]}>
        {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
      </View>
      <Text style={[step.label, (done || active) && step.labelActive]}>{label}</Text>
    </View>
  );
}

const step = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  dotActive: { borderColor: theme.colors.primary },
  label: { fontSize: 14, color: theme.colors.textMuted },
  labelActive: { color: theme.colors.text, fontWeight: "600" },
});

const ORDER_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

function getStepIndex(status: string) {
  const s = status.toLowerCase();
  if (s.includes("deliver")) return 4;
  if (s.includes("ship") || s.includes("transit")) return 3;
  if (s.includes("process") || s.includes("pack")) return 2;
  if (s.includes("confirm")) return 1;
  return 0;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => shopApi.order(id!),
    enabled: !!id,
  });

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
        <Text style={styles.errorText}>Could not load this order.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { order, items, address } = data;
  const stepIdx = getStepIndex(order.status);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.pad}>
      <Stack.Screen options={{ title: order.orderNumber }} />

      {/* Status card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Badge label={order.status} tone={statusTone(order.status)} />
          <Badge
            label={order.paymentStatus ?? "pending"}
            tone={(order.paymentStatus ?? "").toLowerCase() === "paid" ||
              (order.paymentStatus ?? "").toLowerCase() === "captured" ? "success" : "amber"}
          />
        </View>
        <Text style={styles.orderNum}>{order.orderNumber}</Text>
        <Text style={styles.orderDate}>
          {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order status</Text>
        {ORDER_STEPS.map((s, i) => (
          <StatusStep key={s} label={s} done={i < stepIdx} active={i === stepIdx} />
        ))}
      </View>

      {/* Delivery address */}
      {address ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          <Text style={styles.addressName}>{address.name}</Text>
          <Text style={styles.addressText}>
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
          </Text>
          <Text style={styles.addressText}>
            {address.city}, {address.state} — {address.pincode}
          </Text>
          <Text style={styles.addressText}>{address.phone}</Text>
        </View>
      ) : null}

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items ordered</Text>
        {items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              {item.productImage ? (
                <Image
                  source={{ uri: item.productImage }}
                  style={styles.itemThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
                  <Text style={{ fontSize: 20 }}>🌿</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={styles.itemQty}>× {item.qty}</Text>
              </View>
            </View>
            <Text style={styles.itemTotal}>{formatInr(item.total)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalVal}>{formatInr(order.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Shipping</Text>
          <Text style={styles.totalVal}>{formatInr(order.shippingCharge)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Total paid</Text>
          <Text style={styles.grandVal}>{formatInr(order.total)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: theme.colors.textMuted, textAlign: "center", marginBottom: 16 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  backBtnText: { color: theme.colors.primary, fontWeight: "700", fontSize: 16 },
  pad: { padding: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  orderNum: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    color: theme.colors.text,
  },
  orderDate: { marginTop: 4, color: theme.colors.textMuted, fontSize: 13 },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 14,
  },
  addressName: { fontWeight: "700", fontSize: 15, color: theme.colors.text },
  addressText: { color: theme.colors.textMuted, marginTop: 3, lineHeight: 20 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.accentSoft,
  },
  itemThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { fontSize: 14, fontWeight: "600", color: theme.colors.text, flex: 1 },
  itemQty: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  itemTotal: { fontWeight: "700", color: theme.colors.primary },
  totals: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: theme.colors.textMuted },
  totalVal: { fontWeight: "600", color: theme.colors.text },
  grandRow: {
    paddingTop: 12,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  grandLabel: { fontWeight: "700", fontSize: 16, color: theme.colors.text },
  grandVal: { fontWeight: "800", fontSize: 18, color: theme.colors.primary },
});
