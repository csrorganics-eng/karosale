import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button, Input, SectionTitle } from "@/components/ui";
import { RazorpayWebView } from "@/components/payment/RazorpayWebView";
import type { RazorpaySuccessPayload, RazorpayFailedPayload } from "@/components/payment/RazorpayWebView";
import { formatInr } from "@/constants/config";
import { theme } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { shopApi, type Address } from "@/lib/api/shop";
import { useAuthStore } from "@/stores/auth-store";

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "";

/**
 * Razorpay requires contact in E.164 format without '+': e.g. "919876543210".
 * If the stored number already has a country code or +91 prefix, normalise it.
 * If it's a plain 10-digit Indian number, prepend "91".
 * Returns undefined (not an empty string) if the number is absent or invalid,
 * so Razorpay shows a blank field the user can fill freely.
 */
function formatPhoneForRazorpay(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  // Strip everything except digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;            // plain Indian 10-digit
  if (digits.length === 12 && digits.startsWith("91")) return digits; // already 91XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`; // 0XXXXXXXXXX
  if (digits.length >= 10) return digits;                    // other format — pass as-is
  return undefined;                                          // too short — skip prefill
}

type PendingOnlinePayment = {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
};

export default function CheckoutScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);

  const [addressId, setAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [coupon, setCoupon] = useState("");
  const [karmaPoints, setKarmaPoints] = useState(0);
  const [notes, setNotes] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [placing, setPlacing] = useState(false);

  // Razorpay WebView state
  const [pendingPayment, setPendingPayment] = useState<PendingOnlinePayment | null>(null);

  const { data: addressData } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => shopApi.addresses(),
    enabled: !!user,
  });

  // Fetch profile to get phone for Razorpay prefill
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => shopApi.profile(),
    enabled: !!user,
  });
  const { data: cartData } = useQuery({
    queryKey: ["cart"],
    queryFn: () => shopApi.cart(),
  });
  const { data: preview, refetch: refetchPreview } = useQuery({
    queryKey: ["checkout-preview", karmaPoints],
    queryFn: () =>
      shopApi.checkoutPreview({ shippingType: "standard", karmaPointsUsed: karmaPoints }),
    enabled: !!user,
  });

  // Auto-select the default (or first) address once addresses load
  const addresses = addressData?.addresses ?? [];
  if (addressId === null && addresses.length > 0) {
    const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
    setAddressId(defaultAddr.id);
  }

  // Redirect to login if not authenticated
  if (ready && !user) {
    router.replace({ pathname: "/(auth)/login", params: { redirect: "/checkout" } });
    return null;
  }

  const applyCoupon = useMutation({
    mutationFn: async () => {
      const cartId = cartData?.cart.id;
      if (!cartId) throw new Error("No cart");
      await shopApi.applyCoupon(cartId, coupon.trim());
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["checkout-preview"] });
      void refetchPreview();
      Alert.alert("✅ Coupon applied!", `Coupon "${coupon.trim()}" has been applied.`);
    },
    onError: (e) => Alert.alert("Coupon", e instanceof ApiError ? e.message : "Invalid coupon"),
  });

  const totals = preview?.totals;
  const maxKarma = totals?.karmaBalance ?? 0;

  // ── Step 1: Place order (COD confirms immediately; online gets Razorpay order) ──
  const placeOrder = async () => {
    if (!addressId) {
      Alert.alert("Address required", "Please select a delivery address.");
      return;
    }
    if (paymentMethod === "razorpay" && !RAZORPAY_KEY_ID) {
      Alert.alert(
        "Payment unavailable",
        "Online payment is not configured. Please use Cash on Delivery or contact support.",
      );
      return;
    }

    setPlacing(true);
    try {
      const result = await shopApi.placeOrder({
        addressId,
        paymentMethod,
        shippingType: "standard",
        karmaPointsUsed: karmaPoints,
        notes: notes.trim() || undefined,
        isGift,
        giftMessage: isGift ? giftMessage.trim() || undefined : undefined,
      });

      if (paymentMethod === "cod") {
        // COD: confirmed immediately
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void qc.invalidateQueries({ queryKey: ["cart"] });
        Alert.alert(
          "🌿 Order confirmed!",
          `Order ${result.order.orderNumber} is placed. Pay ₹${Number(result.order.total).toLocaleString("en-IN")} on delivery.`,
          [
            {
              text: "View order",
              onPress: () =>
                router.replace({
                  pathname: "/orders/[id]",
                  params: { id: result.order.id },
                }),
            },
          ],
        );
      } else {
        // Online: open Razorpay WebView
        if (!result.razorpayOrderId || !result.amount) {
          throw new Error("Payment gateway did not return an order ID. Please try again.");
        }
        setPendingPayment({
          orderId: result.order.id,
          razorpayOrderId: result.razorpayOrderId,
          amountPaise: result.amount,
        });
      }
    } catch (e) {
      Alert.alert("Checkout failed", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // ── Step 2 (online): Razorpay success — verify server-side ───────────────────
  const handleRazorpaySuccess = async (payload: RazorpaySuccessPayload) => {
    // Capture pendingPayment BEFORE clearing state — React batching can make
    // the state value stale inside this async closure if we clear it first.
    const captured = pendingPayment;
    setPendingPayment(null);
    if (!captured) return;

    try {
      const verified = await shopApi.verifyPayment({
        orderId: captured.orderId,
        razorpayOrderId: payload.razorpayOrderId,
        razorpayPaymentId: payload.razorpayPaymentId,
        razorpaySignature: payload.razorpaySignature,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void qc.invalidateQueries({ queryKey: ["cart"] });

      Alert.alert(
        "✅ Payment successful!",
        `Order ${verified.order.orderNumber} confirmed. Thank you for choosing CSR Organics!`,
        [
          {
            text: "View order",
            onPress: () =>
              router.replace({
                pathname: "/orders/[id]",
                params: { id: verified.order.id },
              }),
          },
        ],
      );
    } catch (e) {
      Alert.alert(
        "Payment received — verifying",
        "Your payment was received. We are confirming your order. Please check 'My orders' in a moment.",
        [{ text: "View orders", onPress: () => router.replace("/orders") }],
      );
    }
  };

  const handleRazorpayFailed = (payload: RazorpayFailedPayload) => {
    setPendingPayment(null);
    Alert.alert(
      "Payment failed",
      payload.description ?? "Your payment could not be processed. Please try again or use COD.",
      [
        { text: "Try again", onPress: () => setPaymentMethod("razorpay") },
        { text: "Use COD instead", onPress: () => setPaymentMethod("cod") },
      ],
    );
  };

  const handleRazorpayDismiss = () => {
    setPendingPayment(null);
    Alert.alert(
      "Payment not completed",
      "Your order is pending payment. You can retry payment from 'My Orders', or choose Cash on Delivery.",
      [
        { text: "View my orders", onPress: () => router.replace("/orders") },
        { text: "Stay here", style: "cancel" },
      ],
    );
  };

  const razorpayAvailable = !!RAZORPAY_KEY_ID;

  return (
    <View style={styles.flex}>
      <AppHeader title="Checkout" showSearch={false} />
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">

        {/* ── 1. Delivery address ──────────────────────────────────── */}
        <SectionTitle title="1. Delivery address" subtitle="Where should we deliver?" />
        {(addressData?.addresses ?? []).length === 0 ? (
          <View style={styles.emptyAddress}>
            <Ionicons name="location-outline" size={28} color={theme.colors.textMuted} />
            <Text style={styles.emptyAddressText}>No saved addresses yet</Text>
          </View>
        ) : null}
        {(addressData?.addresses ?? []).map((a: Address) => (
          <Pressable
            key={a.id}
            style={[styles.card, addressId === a.id && styles.cardSelected]}
            onPress={() => setAddressId(a.id)}>
            <View style={styles.cardHeader}>
              <View style={styles.radioOuter}>
                {addressId === a.id && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{a.name}</Text>
                <Text style={styles.cardSub}>
                  {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} — {a.pincode}
                </Text>
                <Text style={styles.cardSub}>{a.phone}</Text>
                {a.isDefault ? (
                  <View style={styles.defaultPill}>
                    <Text style={styles.defaultPillText}>Default</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        ))}
        <Button
          label="+ Add new address"
          onPress={() => router.push("/addresses")}
          variant="outline"
          style={{ marginBottom: 20 }}
        />

        {/* ── 2. Delivery options ──────────────────────────────────── */}
        <SectionTitle title="2. Delivery options" />
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Delivery notes — gate code, landmarks, preferred time…"
          multiline
        />
        <Pressable style={styles.checkRow} onPress={() => setIsGift((v) => !v)}>
          <View style={[styles.checkbox, isGift && styles.checkboxChecked]}>
            {isGift ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
          <Text style={styles.checkLabel}>This is a gift (prices hidden on slip)</Text>
        </Pressable>
        {isGift ? (
          <Input
            value={giftMessage}
            onChangeText={setGiftMessage}
            placeholder="Gift message"
            multiline
            style={{ marginTop: 8 }}
          />
        ) : null}

        {/* ── 3. Rewards & coupons ─────────────────────────────────── */}
        <SectionTitle title="3. Rewards & coupons" />
        <View style={styles.couponRow}>
          <Input
            value={coupon}
            onChangeText={setCoupon}
            placeholder="Coupon code"
            style={{ flex: 1 }}
          />
          <Button
            label="Apply"
            onPress={() => applyCoupon.mutate()}
            loading={applyCoupon.isPending}
            style={{ paddingHorizontal: 16 }}
          />
        </View>

        {maxKarma > 0 ? (
          <View style={styles.karmaBox}>
            <Text style={styles.karmaTitle}>✨ Karma points ({maxKarma} available)</Text>
            <Text style={styles.karmaHint}>100 pts = ₹10 off · max 50% of order value</Text>
            <View style={styles.karmaStepper}>
              <Pressable
                onPress={() => setKarmaPoints((k) => Math.max(0, k - 100))}
                style={styles.karmaBtn}>
                <Text style={styles.karmaBtnText}>−100</Text>
              </Pressable>
              <Text style={styles.karmaVal}>{karmaPoints} pts</Text>
              <Pressable
                onPress={() => setKarmaPoints((k) => Math.min(maxKarma, k + 100))}
                style={styles.karmaBtn}>
                <Text style={styles.karmaBtnText}>+100</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ── 4. Payment ───────────────────────────────────────────── */}
        <SectionTitle title="4. Payment method" />

        {/* Cash on Delivery */}
        <Pressable
          style={[styles.payCard, paymentMethod === "cod" && styles.paySelected]}
          onPress={() => setPaymentMethod("cod")}>
          <View style={styles.payRow}>
            <View style={[styles.radioOuter, paymentMethod === "cod" && styles.radioOuterActive]}>
              {paymentMethod === "cod" && <View style={styles.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.payLabelRow}>
                <Text style={styles.payTitle}>Cash on delivery</Text>
                <View style={styles.payBadge}>
                  <Text style={styles.payBadgeText}>Free</Text>
                </View>
              </View>
              <Text style={styles.paySub}>Pay in cash when your order arrives</Text>
            </View>
            <Ionicons name="wallet-outline" size={22} color={theme.colors.textMuted} />
          </View>
        </Pressable>

        {/* Online payment via Razorpay */}
        <Pressable
          style={[
            styles.payCard,
            paymentMethod === "razorpay" && styles.paySelected,
            !razorpayAvailable && styles.payDisabled,
          ]}
          onPress={() => razorpayAvailable && setPaymentMethod("razorpay")}>
          <View style={styles.payRow}>
            <View
              style={[
                styles.radioOuter,
                paymentMethod === "razorpay" && styles.radioOuterActive,
                !razorpayAvailable && { borderColor: theme.colors.border },
              ]}>
              {paymentMethod === "razorpay" && <View style={styles.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.payLabelRow}>
                <Text style={[styles.payTitle, !razorpayAvailable && { color: theme.colors.textMuted }]}>
                  Pay online
                </Text>
                {razorpayAvailable ? (
                  <View style={[styles.payBadge, { backgroundColor: "#0033a0" + "18" }]}>
                    <Text style={[styles.payBadgeText, { color: "#0033a0" }]}>Razorpay</Text>
                  </View>
                ) : (
                  <View style={[styles.payBadge, { backgroundColor: theme.colors.surfaceSubtle }]}>
                    <Text style={[styles.payBadgeText, { color: theme.colors.textMuted }]}>Coming soon</Text>
                  </View>
                )}
              </View>
              <Text style={styles.paySub}>
                {razorpayAvailable
                  ? "UPI, credit/debit cards, netbanking, wallets"
                  : "Online payments are not configured"}
              </Text>
            </View>
            <Ionicons
              name="card-outline"
              size={22}
              color={razorpayAvailable ? theme.colors.textMuted : theme.colors.border}
            />
          </View>
        </Pressable>

        {/* ── 5. Order summary ─────────────────────────────────────── */}
        {totals ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order summary</Text>
            <Row label="Subtotal" value={formatInr(totals.subtotal)} />
            {totals.tierDiscount > 0 ? (
              <Row label="Tier discount" value={`−${formatInr(totals.tierDiscount)}`} accent />
            ) : null}
            {totals.couponDiscount > 0 ? (
              <Row label={`Coupon (${totals.appliedCouponCode ?? ""})`} value={`−${formatInr(totals.couponDiscount)}`} accent />
            ) : null}
            {totals.karmaDiscount > 0 ? (
              <Row label="Karma discount" value={`−${formatInr(totals.karmaDiscount)}`} accent />
            ) : null}
            <Row label="Shipping" value={totals.shippingCharge === 0 ? "Free" : formatInr(totals.shippingCharge)} />
            <View style={styles.divider} />
            <Row label="Total" value={formatInr(totals.total)} bold />
          </View>
        ) : null}

        {/* ── Place order button ───────────────────────────────────── */}
        <Button
          label={
            paymentMethod === "cod"
              ? "Place order (Pay on delivery)"
              : `Pay ${totals ? formatInr(totals.total) : ""} securely →`
          }
          onPress={() => void placeOrder()}
          loading={placing}
          variant="warm"
          style={{ marginTop: 24 }}
        />

        {paymentMethod === "razorpay" && razorpayAvailable ? (
          <View style={styles.secureNote}>
            <Ionicons name="lock-closed" size={12} color={theme.colors.primary} />
            <Text style={styles.secureNoteText}>
              Payments secured by Razorpay · 256-bit SSL encryption
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Razorpay WebView modal ───────────────────────────────── */}
      {pendingPayment ? (
        <RazorpayWebView
          keyId={RAZORPAY_KEY_ID}
          razorpayOrderId={pendingPayment.razorpayOrderId}
          amountPaise={pendingPayment.amountPaise}
          prefill={{
            name: user?.name ?? undefined,
            email: user?.email ?? undefined,
            contact: formatPhoneForRazorpay(profileData?.profile?.phone),
          }}
          description="CSR Organics — certified organic products"
          onSuccess={(p) => void handleRazorpaySuccess(p)}
          onFailed={handleRazorpayFailed}
          onDismiss={handleRazorpayDismiss}
        />
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text
        style={[
          styles.rowVal,
          bold && styles.bold,
          accent && { color: theme.colors.success },
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: 16, paddingBottom: 48 },

  emptyAddress: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
    marginBottom: 8,
  },
  emptyAddressText: { color: theme.colors.textMuted, fontSize: 14 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  cardSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.accentSoft },
  cardHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  cardTitle: { fontWeight: "700", fontSize: 15, color: theme.colors.text },
  cardSub: { color: theme.colors.textMuted, marginTop: 2, fontSize: 13, lineHeight: 18 },
  defaultPill: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: theme.colors.success + "18",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultPillText: { fontSize: 11, fontWeight: "700", color: theme.colors.success },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  radioOuterActive: { borderColor: theme.colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkLabel: { fontSize: 14, color: theme.colors.text },

  couponRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 12 },

  karmaBox: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.card,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary + "20",
  },
  karmaTitle: { fontWeight: "700", color: theme.colors.primary, fontSize: 14 },
  karmaHint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, marginBottom: 12 },
  karmaStepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  karmaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.button,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  karmaBtnText: { fontWeight: "700", color: theme.colors.text },
  karmaVal: { fontWeight: "800", fontSize: 16, flex: 1, textAlign: "center", color: theme.colors.primary },

  payCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  paySelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.accentSoft },
  payDisabled: { opacity: 0.55 },
  payRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  payLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  payTitle: { fontWeight: "700", fontSize: 15, color: theme.colors.text },
  paySub: { color: theme.colors.textMuted, fontSize: 13 },
  payBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: theme.colors.accentWarmMuted,
  },
  payBadgeText: { fontSize: 11, fontWeight: "700", color: theme.colors.accentWarm },

  summary: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  summaryTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: theme.colors.textMuted, fontSize: 14 },
  rowVal: { fontWeight: "600", fontSize: 14, color: theme.colors.text },
  bold: { fontWeight: "800", fontSize: 16, color: theme.colors.text },

  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  secureNoteText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "600",
  },
});
