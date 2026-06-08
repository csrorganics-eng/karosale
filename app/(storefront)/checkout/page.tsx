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

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<{
    items: Array<{ total: string }>;
    cart: { id: string } | null;
  } | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [loading, setLoading] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [karmaBalance, setKarmaBalance] = useState(0);
  const [karmaPointsUsed, setKarmaPointsUsed] = useState(0);
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

    fetch("/api/cart")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCart(json.data);
      });

    fetch("/api/addresses")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const list = json.data.addresses as Address[];
          setAddresses(list);
          const def = list.find((a) => a.isDefault) ?? list[0];
          if (def) setAddressId(def.id);
        }
      });

    fetch("/api/loyalty/balance")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && typeof json.data?.karmaPoints === "number") {
          setKarmaBalance(json.data.karmaPoints);
        }
      });
  }, [status, router]);

  const subtotal = cart?.items.reduce((s, i) => s + parseFloat(i.total), 0) ?? 0;

  async function saveAddress() {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAddr, isDefault: addresses.length === 0 }),
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error ?? "Failed to save address");
      return;
    }
    const addr = json.data.address as Address;
    setAddresses((prev) => [...prev, addr]);
    setAddressId(addr.id);
    setShowNewAddress(false);
  }

  async function placeOrder() {
    if (!addressId) {
      alert("Please select or add a delivery address");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          paymentMethod,
          shippingType: "standard",
          karmaPointsUsed,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error ?? "Order failed");
        return;
      }

      if (paymentMethod === "cod") {
        router.push(`/checkout/success?order=${json.data.order.orderNumber}`);
        return;
      }

      const { razorpayOrderId, amount, order } = json.data;
      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key || !window.Razorpay) {
        alert("Razorpay not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID in Vercel.");
        return;
      }

      const rzp = new window.Razorpay({
        key,
        amount,
        currency: "INR",
        name: BRAND_NAME,
        description: `Order ${order.orderNumber}`,
        order_id: razorpayOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await fetch("/api/orders/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          router.push(`/checkout/success?order=${order.orderNumber}`);
        },
      });
      rzp.open();
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || !cart) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center">Loading checkout...</div>;
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Delivery address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  onChange={() => setAddressId(addr.id)}
                />
                <div className="text-sm">
                  <p className="font-medium">{addr.name}</p>
                  <p className="text-text-secondary">
                    {addr.line1}, {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                  <p className="text-text-secondary">{addr.phone}</p>
                </div>
              </label>
            ))}
            <Button variant="outline" type="button" onClick={() => setShowNewAddress(!showNewAddress)}>
              {showNewAddress ? "Cancel" : "+ Add new address"}
            </Button>
            {showNewAddress && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Full name" value={newAddr.name} onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })} />
                <Input placeholder="Phone" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} />
                <Input className="sm:col-span-2" placeholder="Address line 1" value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} />
                <Input className="sm:col-span-2" placeholder="City" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} />
                <Input placeholder="State" value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} />
                <Input placeholder="Pincode" value={newAddr.pincode} onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })} />
                <Button type="button" className="sm:col-span-2" onClick={saveAddress}>
                  Save address
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={paymentMethod === "razorpay"}
                onChange={() => setPaymentMethod("razorpay")}
              />
              Pay online (Razorpay)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
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
              />
              <p className="text-xs text-text-secondary">Using {karmaPointsUsed} points</p>
            </div>
            <p className="text-lg font-semibold">Merchandise: {formatINR(subtotal)}</p>
            <p className="text-xs text-text-secondary">
              Shipping, tier &amp; coupon discounts are calculated on the server when you place the order.
            </p>
            <Button className="w-full" size="lg" disabled={loading || !addressId} onClick={placeOrder}>
              {loading ? "Processing..." : "Place Order"}
            </Button>
          </CardContent>
        </Card>

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
