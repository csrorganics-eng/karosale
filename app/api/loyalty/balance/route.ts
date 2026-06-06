import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getTierForPoints, getUserKarmaBalance } from "@/lib/loyalty";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const balance = await getUserKarmaBalance(session.user.id);
    const tier = await getTierForPoints(balance);

    return jsonOk({
      karmaPoints: balance,
      tier: tier
        ? {
            name: tier.name,
            discountPct: tier.discountPct,
            badgeLabel: tier.badgeLabel,
            alwaysFreeShipping: tier.alwaysFreeShipping ?? false,
            freeShippingOn: tier.freeShippingOn,
          }
        : null,
    });
  } catch {
    return jsonError("Failed to load loyalty", 500);
  }
}
