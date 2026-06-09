import { cn } from "@/lib/utils";

/** Use on `<table>` inside `AdminTableShell` for consistent padding and horizontal scroll on small screens. */
export const ADMIN_DATA_TABLE_CLASS =
  "w-full min-w-[32rem] text-sm [&_th]:p-2 [&_td]:p-2 sm:[&_th]:p-4 sm:[&_td]:p-4";

export function AdminTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[length:var(--radius-card)] border border-border bg-surface [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {children}
    </div>
  );
}
