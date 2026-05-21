import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToAccount({ label = "Back to account" }: { label?: string }) {
  return (
    <Button variant="ghost" asChild className="mb-4 -ml-2 gap-2 text-text-secondary hover:text-text-primary">
      <Link href="/account">
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
