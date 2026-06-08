import Link from "next/link";
import { CartUpdatedBeacon } from "@/components/storefront/CartUpdatedBeacon";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { Button } from "@/components/ui/button";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 py-24">
      <CartUpdatedBeacon />
      <div className="text-left">
        <BackToAccount />
      </div>
      <div className="text-center">
      <p className="text-6xl text-success">✓</p>
      <h1 className="font-display mt-4 text-3xl font-bold">Order Placed!</h1>
      {order && (
        <p className="mt-2 font-mono text-xl text-primary">{order}</p>
      )}
      <p className="mt-4 text-text-secondary">
        WhatsApp confirmation will be sent when Interakt is configured.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/orders">Track Order</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
      </div>
    </div>
  );
}
