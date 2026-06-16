const R2_HOST = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/^https?:\/\//, "").split("/")[0];
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com";

type Props = { lcpImageUrl?: string | null };

/**
 * DNS hints for storefront performance (R2 media, checkout, fonts already allowed by CSP).
 */
export function ResourceHints({ lcpImageUrl }: Props) {
  return (
    <>
      {R2_HOST ? (
        <>
          <link rel="preconnect" href={`https://${R2_HOST}`} crossOrigin="anonymous" />
          <link rel="dns-prefetch" href={`https://${R2_HOST}`} />
        </>
      ) : null}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href={RAZORPAY_SCRIPT} />
      <link rel="dns-prefetch" href="https://api.razorpay.com" />
      <link rel="dns-prefetch" href="https://cdn.shiprocket.in" />
      {lcpImageUrl ? <link rel="preload" as="image" href={lcpImageUrl} fetchPriority="high" /> : null}
    </>
  );
}
