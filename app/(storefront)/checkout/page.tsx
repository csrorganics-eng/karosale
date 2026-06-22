"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { emitCartUpdated } from "@/lib/cart-events";
import { useLoadingOverlay } from "@/components/providers/loading-overlay-provider";
import { WaitingSpinner } from "@/components/ui/waiting-overlay";

interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

type CheckoutCartPayload = {
  items: Array<{ total: string }>;
  cart: { id: string } | null;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

/** Wait for next/script or inject checkout.js so Place order works even on fast clicks / lazy load. */
async function ensureRazorpayCheckoutReady(maxWaitMs = 12000): Promise<void> {
  if (typeof window === "undefined") return;
  const deadline = Date.now() + maxWaitMs;
  while (!window.Razorpay && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 40));
  }
  if (window.Razorpay) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load")), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.src = RAZORPAY_SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () =>
      reject(
        new Error(
          "Could not load Razorpay checkout. Check your connection, disable ad blockers for this site, or try again.",
        ),
      );
    document.body.appendChild(s);
  });

  const until = Date.now() + 8000;
  while (!window.Razorpay && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 40));
  }
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout did not become available. Refresh the page and try again.");
  }
}

function formatZodDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as { fieldErrors?: Record<string, string[]> };
  if (!d.fieldErrors) return null;
  const parts = Object.entries(d.fieldErrors).flatMap(([k, v]) =>
    (v ?? []).map((msg) => `${k}: ${msg}`),
  );
  return parts.length ? parts.join(" · ") : null;
}

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { start: startGlobalLoading, stop: stopGlobalLoading, runWithLoading } = useLoadingOverlay();
  const [cart, setCart] = useState<CheckoutCartPayload | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [addressId, setAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [loading, setLoading] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [karmaBalance, setKarmaBalance] = useState(0);
  const [karmaPointsUsed, setKarmaPointsUsed] = useState(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [cartLoadState, setCartLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [newAddr, setNewAddr] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/account?redirect=/checkout");
      return;
    }
    if (status !== "authenticated") return;

    let cancelled = false;
    setCheckoutError(null);
    setCartLoadState("loading");
    setCart(null);

    void (async () => {
      try {
        await fetch("/api/cart/merge-guest", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      } catch {
        /* non-fatal */
      }
      try {
        const cartRes = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
        const cartJson = (await cartRes.json()) as {
          success?: boolean;
          data?: CheckoutCartPayload;
        };
        if (cancelled) return;
        if (!cartJson.success) {
          setCartLoadState("error");
          return;
        }
        setCart(cartJson.data ?? { cart: null, items: [] });
        setCartLoadState("ready");
      } catch {
        if (!cancelled) setCartLoadState("error");
      }
    })();

    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        const p = json.data.profile as { name: string | null; phone: string | null };
        setNewAddr((prev) => ({
          ...prev,
          name: prev.name || p.name?.trim() || "",
          phone: prev.phone || p.phone?.trim() || "",
        }));
      })
      .catch(() => undefined);

    fetch("/api/addresses")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const list = json.data.addresses as Address[];
          setAddresses(list);
          const def = list.find((a) => a.isDefault) ?? list[0];
          if (def) setAddressId(def.id);
          if (list.length === 0) {
            setShowNewAddress(true);
          }
        }
      })
      .finally(() => setAddressesLoaded(true));

    fetch("/api/loyalty/balance", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && typeof json.data?.karmaPoints === "number") {
          setKarmaBalance(json.data.karmaPoints);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status, router]);

  const subtotal = cart?.items.reduce((s, i) => s + parseFloat(i.total), 0) ?? 0;
  const canPlaceOrder = Boolean(addressId);

  async function saveAddress() {
    setCheckoutError(null);
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newAddr,
        line2: newAddr.line2.trim() || undefined,
        isDefault: addresses.length === 0,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      const detail = formatZodDetails(json.details);
      setCheckoutError(detail ?? json.error ?? "Failed to save address");
      return;
    }
    const addr = json.data.address as Address;
    setAddresses((prev) => [...prev, addr]);
    setAddressId(addr.id);
    setShowNewAddress(false);
    setCheckoutError(null);
  }

  async function placeOrder() {
    setCheckoutError(null);
    if (loading) return;
    if (!addressId) {
      setCheckoutError("Add or select a delivery address before placing your order.");
      return;
    }
    if (!cart?.items?.length) {
      setCheckoutError("Your bag is empty. Add something from the shop before checking out.");
      return;
    }

    setLoading(true);
    startGlobalLoading(
      paymentMethod === "cod" ? "Placing your order…" : "Preparing secure checkout…",
    );
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          paymentMethod,
          shippingType: "standard",
          karmaPointsUsed,
          notes: deliveryNotes.trim() || undefined,
          isGift,
          giftMessage: isGift ? giftMessage.trim() || undefined : undefined,
          affiliateUsername:
            typeof window !== "undefined"
              ? sessionStorage.getItem("affiliate_username_override") ?? undefined
              : undefined,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        details?: unknown;
        data?: {
          order: { orderNumber: string; id: string };
          razorpayOrderId?: string;
          amount?: number;
        };
      };
      if (!json.success || !json.data?.order) {
        const detail = formatZodDetails(json.details);
        setCheckoutError(detail ?? json.error ?? "Order failed");
        return;
      }

      if (paymentMethod === "cod") {
        emitCartUpdated();
        router.push(`/checkout/success?order=${json.data.order.orderNumber}`);
        return;
      }

      const { razorpayOrderId, amount, order } = json.data as {
        razorpayOrderId: string;
        amount: number;
        order: { orderNumber: string; id: string };
      };
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        setCheckoutError(
          "Razorpay is not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID to the same key type (test/live) as RAZORPAY_KEY_ID on the server.",
        );
        return;
      }

      await ensureRazorpayCheckoutReady();

      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        setCheckoutError("Razorpay checkout is unavailable. Refresh the page or try again in a moment.");
        return;
      }
      stopGlobalLoading();

      const userEmail = session?.user?.email?.trim() || undefined;

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        const rzp = new RazorpayCtor({
          key,
          amount,
          currency: "INR",
          name: BRAND_NAME,
          description: `Order ${order.orderNumber}`,
          order_id: razorpayOrderId,
          prefill: userEmail ? { email: userEmail } : undefined,
          theme: { color: "#166534" },
          modal: {
            ondismiss: () => {
              setCheckoutError(
                "Payment was not completed. Your bag is unchanged — try Pay online again or choose Cash on Delivery.",
              );
              void (async () => {
                try {
                  const cartRes = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
                  const cartJson = (await cartRes.json()) as {
                    success?: boolean;
                    data?: CheckoutCartPayload;
                  };
                  if (cartJson.success) {
                    setCart(cartJson.data ?? { cart: null, items: [] });
                  }
                } catch {
                  /* ignore */
                }
              })();
              finish();
            },
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await runWithLoading("Confirming payment…", async () => {
                const verifyRes = await fetch("/api/orders/verify-payment", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: order.id,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                  }),
                });
                const verifyJson = (await verifyRes.json()) as { success?: boolean; error?: string };
                if (!verifyRes.ok || !verifyJson.success) {
                  throw new Error(
                    verifyJson.error ?? `Payment confirmation failed (${verifyRes.status})`,
                  );
                }
              });
              emitCartUpdated();
              router.push(`/checkout/success?order=${order.orderNumber}`);
            } catch (e) {
              setCheckoutError(
                e instanceof Error
                  ? e.message
                  : "Payment could not be confirmed. You can retry from checkout or contact support with your order number.",
              );
              try {
                const cartRes = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
                const cartJson = (await cartRes.json()) as {
                  success?: boolean;
                  data?: CheckoutCartPayload;
                };
                if (cartJson.success) {
                  setCart(cartJson.data ?? { cart: null, items: [] });
                }
              } catch {
                /* ignore */
              }
            } finally {
              finish();
            }
          },
        });
        rzp.open();
      });
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Something went wrong while starting checkout.");
    } finally {
      stopGlobalLoading();
      setLoading(false);
    }
  }

  async function retryLoadCart() {
    if (status !== "authenticated") return;
    setCheckoutError(null);
    setCartLoadState("loading");
    setCart(null);
    try {
      try {
        await fetch("/api/cart/merge-guest", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      } catch {
        /* ignore */
      }
      const cartRes = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
      const cartJson = (await cartRes.json()) as { success?: boolean; data?: CheckoutCartPayload };
      if (!cartJson.success) {
        setCartLoadState("error");
        return;
      }
      setCart(cartJson.data ?? { cart: null, items: [] });
      setCartLoadState("ready");
    } catch {
      setCartLoadState("error");
    }
  }

  if (status === "loading" || (status === "authenticated" && (cartLoadState === "idle" || cartLoadState === "loading"))) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <WaitingSpinner label="Loading checkout…" size="lg" />
      </div>
    );
  }

  if (status === "authenticated" && cartLoadState === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Could not load your bag</h1>
        <p className="mt-3 text-sm text-text-secondary">
          Check your connection and try again. If the problem continues, sign out and back in.
        </p>
        <Button className="mt-6" size="lg" onClick={() => void retryLoadCart()}>
          Retry
        </Button>
        <p className="mt-6 text-sm">
          <Link href="/cart" className="text-primary hover:underline">
            ← Back to cart
          </Link>
        </p>
      </div>
    );
  }

  if (status === "authenticated" && cartLoadState === "ready" && cart && cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Nothing to check out</h1>
        <p className="mt-3 text-sm text-text-secondary">
          Your bag is empty. Add products from the shop, then return here to pay.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/shop">Browse shop</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/cart">View cart</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <WaitingSpinner label="Loading checkout…" size="lg" />
      </div>
    );
  }

  return (
    <>
      <Script src={RAZORPAY_SCRIPT} strategy="afterInteractive" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>

        {checkoutError && (
          <div
            className="mt-4 rounded-[length:var(--radius-card)] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {checkoutError}
          </div>
        )}

        {addressesLoaded && addresses.length === 0 && (
          <div className="mt-6 rounded-[length:var(--radius-card)] border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-medium">No delivery address on file yet.</p>
            <p className="mt-1 text-xs opacity-90">
              We opened the form below—complete it here, or save an address on your profile for future orders.
            </p>
            <Button className="mt-3" variant="secondary" size="sm" asChild>
              <Link href="/account/profile?redirect=/checkout">Manage addresses in profile</Link>
            </Button>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>1. Delivery address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addresses.length > 0 && (
              <>
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex cursor-pointer gap-3 rounded-[10px] border p-4 ${
                      addressId === addr.id ? "border-primary bg-accent-soft" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === addr.id}
                      onChange={() => {
                        setAddressId(addr.id);
                        setCheckoutError(null);
                      }}
                    />
                    <div className="text-sm">
                      <p className="font-medium">{addr.name}</p>
                      <p className="text-text-secondary">
                        {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-text-secondary">{addr.phone}</p>
                    </div>
                  </label>
                ))}
                <Button variant="outline" type="button" onClick={() => setShowNewAddress(!showNewAddress)}>
                  {showNewAddress ? "Cancel new address" : "+ Add another address"}
                </Button>
              </>
            )}
            {showNewAddress && (
              <div className="rounded-[10px] border border-border bg-surface-subtle/60 p-4">
                <p className="mb-3 text-sm font-medium text-text-primary">
                  {addresses.length === 0 ? "Add your delivery address" : "New address"}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Full name"
                    value={newAddr.name}
                    onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })}
                  />
                  <Input
                    placeholder="Phone (10 digits)"
                    value={newAddr.phone}
                    onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  />
                  <Input
                    className="sm:col-span-2"
                    placeholder="Address line 1"
                    value={newAddr.line1}
                    onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                  />
                  <Input
                    className="sm:col-span-2"
                    placeholder="Address line 2 (optional)"
                    value={newAddr.line2}
                    onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })}
                  />
                  <Input
                    placeholder="City"
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                  />
                  <Input
                    placeholder="State"
                    value={newAddr.state}
                    onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                  />
                  <Input
                    className="sm:col-span-2"
                    placeholder="PIN code (6 digits)"
                    value={newAddr.pincode}
                    onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <Button type="button" className="sm:col-span-2" onClick={() => void saveAddress()}>
                    Save address to account
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>2. Delivery options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notes for delivery (optional)</label>
              <textarea
                className="mt-1 flex min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Gate code, landmark, safe drop spot…"
                maxLength={500}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
              <p className="mt-1 text-xs text-text-secondary">{deliveryNotes.length}/500</p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={isGift}
                onChange={(e) => {
                  setIsGift(e.target.checked);
                  if (!e.target.checked) setGiftMessage("");
                }}
              />
              <span>This order is a gift (hide prices on packing slip when supported)</span>
            </label>
            {isGift && (
              <div>
                <label className="text-sm font-medium">Gift message (optional)</label>
                <textarea
                  className="mt-1 flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Short message for the recipient"
                  maxLength={300}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div
          className={`mt-4 transition-opacity ${!canPlaceOrder ? "pointer-events-none opacity-45" : ""}`}
          aria-hidden={!canPlaceOrder}
        >
          <Card>
            <CardHeader>
              <CardTitle>3. Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canPlaceOrder && (
                <p className="text-sm font-medium text-text-secondary">
                  Complete step 1—choose or save a delivery address—to enable payment.
                </p>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => setPaymentMethod("razorpay")}
                  disabled={!canPlaceOrder}
                />
                <span>
                  Pay online (Razorpay) — UPI, cards, net banking &amp; wallets in the secure window
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  disabled={!canPlaceOrder}
                />
                Cash on Delivery
              </label>
              <div className="rounded-[10px] border border-border bg-surface-subtle p-4">
                <p className="text-sm font-medium">Karma points</p>
                <p className="text-xs text-text-secondary">
                  Balance: {karmaBalance} · 100 pts = ₹10 off · max 50% of order (online: deducted after payment)
                </p>
                <input
                  type="range"
                  min={0}
                  max={karmaBalance}
                  value={Math.min(karmaPointsUsed, karmaBalance)}
                  onChange={(e) => setKarmaPointsUsed(parseInt(e.target.value, 10))}
                  className="mt-2 w-full"
                  disabled={!canPlaceOrder}
                />
                <p className="text-xs text-text-secondary">Using {karmaPointsUsed} points</p>
              </div>
              <p className="text-lg font-semibold">Merchandise: {formatINR(subtotal)}</p>
              <p className="text-xs text-text-secondary">
                Shipping, tier &amp; coupon discounts are calculated on the server when you place the order.
              </p>
              <Button
                className="w-full"
                size="lg"
                disabled={loading || !addressId || !cart.items.length}
                onClick={() => void placeOrder()}
              >
                {loading ? "Processing..." : "Place order"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="mt-4 text-center text-sm">
          Signed in as {session?.user?.email}.{" "}
          <Link href="/cart" className="text-primary hover:underline">
            ← Back to cart
          </Link>
        </p>
      </div>
    </>
  );
}
