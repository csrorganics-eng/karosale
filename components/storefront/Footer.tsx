import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface-subtle">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-2xl font-bold text-primary">Karosale</p>
            <p className="mt-2 max-w-sm text-sm text-text-secondary">
              Smart Commerce. Seamless Experience. Certified organic products delivered across India.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/shop" className="hover:text-primary">All Products</Link></li>
              <li><Link href="/shop?isOrganic=true" className="hover:text-primary">Organic Certified</Link></li>
              <li><Link href="/wishlist" className="hover:text-primary">Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/orders" className="hover:text-primary">Track Order</Link></li>
              <li><Link href="/account" className="hover:text-primary">My Account</Link></li>
              <li><a href="mailto:hello@karosale.com" className="hover:text-primary">hello@karosale.com</a></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-8 text-center text-xs text-text-secondary">
          © {new Date().getFullYear()} Karosale. Organic. Natural. Trusted.
        </p>
      </div>
    </footer>
  );
}
