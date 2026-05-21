import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoyaltyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Karma Rewards</h1>
      <p className="mt-2 text-text-secondary">Earn 1 point per ₹10 spent. 100 points = ₹10 off.</p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>🌱 Seedling — 0–499 pts</p>
          <p>🌿 Grower — 500–1999 pts (3% off)</p>
          <p>🌾 Harvester — 2000–4999 pts (5% off)</p>
          <p>👨‍🌾 Master Farmer — 5000+ pts (8% off)</p>
        </CardContent>
      </Card>
    </div>
  );
}
