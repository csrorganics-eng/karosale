/**
 * Read-only view of which SEO-related env vars are set (never exposes secret values).
 * Used by the admin SEO dashboard.
 */
export type SeoEnvSnapshot = {
  siteUrl: boolean;
  appUrl: boolean;
  gscVerification: boolean;
  bingVerification: boolean;
  gtm: boolean;
  clarity: boolean;
  ogDefaultImage: boolean;
  twitterSite: boolean;
  twitterCreator: boolean;
  auditSecret: boolean;
  deployWebhookSecret: boolean;
};

export function getSeoEnvSnapshot(): SeoEnvSnapshot {
  const t = (v: string | undefined) => Boolean(v?.trim());
  return {
    siteUrl: t(process.env.NEXT_PUBLIC_SITE_URL),
    appUrl: t(process.env.NEXT_PUBLIC_APP_URL),
    gscVerification: t(process.env.NEXT_PUBLIC_GSC_VERIFICATION),
    bingVerification: t(process.env.NEXT_PUBLIC_BING_VERIFICATION),
    gtm: t(process.env.NEXT_PUBLIC_GTM_ID),
    clarity: t(process.env.NEXT_PUBLIC_CLARITY_ID),
    ogDefaultImage: t(process.env.NEXT_PUBLIC_OG_DEFAULT_IMAGE),
    twitterSite: t(process.env.NEXT_PUBLIC_TWITTER_SITE),
    twitterCreator: t(process.env.NEXT_PUBLIC_TWITTER_CREATOR),
    auditSecret: t(process.env.AUDIT_SECRET),
    deployWebhookSecret: t(process.env.DEPLOY_WEBHOOK_SECRET),
  };
}

export function countSeoEnvConfigured(snapshot: SeoEnvSnapshot): number {
  return Object.values(snapshot).filter(Boolean).length;
}
