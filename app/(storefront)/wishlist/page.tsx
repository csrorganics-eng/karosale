import { BackToAccount } from "@/components/storefront/BackToAccount";

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="text-left">
        <BackToAccount />
      </div>
      <p className="text-6xl">♡</p>
      <h1 className="font-display mt-4 text-2xl font-bold">Wishlist</h1>
      <p className="mt-2 text-text-secondary">Sign in to save products to your wishlist.</p>
    </div>
  );
}
