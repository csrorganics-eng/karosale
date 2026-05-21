import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackToHome({ label = "Back" }: { label?: string }) {
  return (
    <Button variant="ghost" asChild className="mb-4 -ml-2 gap-2 text-text-secondary hover:text-text-primary">
      <Link href="/">
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
