import { EmailLayout } from "./base-layout";

export function LowStockAdminEmail(props: {
  productName: string;
  stockQty: number;
  threshold: number;
  inventoryUrl: string;
}) {
  return (
    <EmailLayout preview="Low stock alert">
      <h2 style={{ color: "#B45309" }}>⚠️ Low Stock Alert</h2>
      <p>
        <strong>{props.productName}</strong> is running low.
      </p>
      <p>
        Current stock: {props.stockQty} (threshold: {props.threshold})
      </p>
      <a href={props.inventoryUrl} style={{ color: "#1B4332" }}>
        Open inventory →
      </a>
    </EmailLayout>
  );
}
