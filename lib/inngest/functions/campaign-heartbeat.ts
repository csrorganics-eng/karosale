import { and, eq, lte, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";

/** Daily — log active campaigns (extend with WhatsApp broadcast when Interakt templates are approved). */
export const campaignHeartbeatFunction = inngest.createFunction(
  { id: "campaign-heartbeat" },
  { cron: "0 10 * * *" },
  async ({ step }) => {
    await step.run("list-active-campaigns", async () => {
      const now = new Date();
      const active = await db
        .select({ id: campaigns.id, name: campaigns.name })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.isActive, true),
            lte(campaigns.startsAt, now),
            gte(campaigns.endsAt, now),
          ),
        );
      return { activeCount: active.length, names: active.map((c) => c.name) };
    });
  },
);
