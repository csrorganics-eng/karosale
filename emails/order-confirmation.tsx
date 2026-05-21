import { EmailLayout } from "./base-layout";

export interface OrderConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{ name: string; qty: number; price: string }>;
  subtotal: string;
  discount: string;
  total: string;
  addressLine: string;
  trackUrl: string;
}

export function OrderConfirmationEmail(props: OrderConfirmationEmailProps) {
  return (
    <EmailLayout preview={`Order ${props.orderNumber} confirmed`}>
      <h2 style={{ margin: "0 0 8px", color: "#1B4332" }}>Thank you for your order! 🌿</h2>
      <p style={{ margin: "0 0 16px", color: "#5C6B62" }}>
        Hi {props.customerName}, we&apos;ve received your order.
      </p>
      <p style={{ margin: "0 0 4px" }}>
        <strong>Order:</strong> {props.orderNumber}
      </p>
      <p style={{ margin: "0 0 16px" }}>
        <strong>Date:</strong> {props.orderDate}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #E2EDE6" }}>
            <th style={{ textAlign: "left", padding: "8px 0" }}>Item</th>
            <th style={{ textAlign: "right" }}>Qty</th>
            <th style={{ textAlign: "right" }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {props.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E2EDE6" }}>
              <td style={{ padding: "8px 0" }}>{item.name}</td>
              <td style={{ textAlign: "right" }}>{item.qty}</td>
              <td style={{ textAlign: "right" }}>₹{item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: "16px" }}>
        Subtotal: ₹{props.subtotal}
        {parseFloat(props.discount) > 0 && <> · Discount: -₹{props.discount}</>}
      </p>
      <p style={{ fontSize: "18px", fontWeight: 700, color: "#1B4332" }}>Total: ₹{props.total}</p>
      <p style={{ marginTop: "16px", fontSize: "14px" }}>
        <strong>Deliver to:</strong>
        <br />
        {props.addressLine}
      </p>
      <a
        href={props.trackUrl}
        style={{
          display: "inline-block",
          marginTop: "20px",
          backgroundColor: "#1B4332",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Track your order
      </a>
    </EmailLayout>
  );
}
