import { Footer } from "@/components/storefront/Footer";
import { Header } from "@/components/storefront/Header";
import { ShopChatWidget } from "@/components/storefront/ShopChatWidget";
import { StorefrontCartItemsProvider } from "@/components/storefront/storefront-cart-items-provider";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StorefrontCartItemsProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ShopChatWidget />
      </div>
    </StorefrontCartItemsProvider>
  );
}
