import { EmailLayout } from "./base-layout";

export function OrderShippedEmail(props: {
  orderNumber: string;
  awb: string;
  courier: string;
  trackUrl: string;
  eta: string;
}) {
  return (
    <EmailLayout preview={`Order ${props.orderNumber} shipped`}>
      <h2 style={{ margin: "0 0 8px", color: "#1B4332" }}>Your order is on the way! 🚚</h2>
      <p>
        Order <strong>{props.orderNumber}</strong> has been shipped via {props.courier}.
      </p>
      <p>
        AWB: <strong>{props.awb}</strong>
      </p>
      <p>Estimated delivery: {props.eta}</p>
      <a
        href={props.trackUrl}
        style={{
          display: "inline-block",
          marginTop: "16px",
          backgroundColor: "#1B4332",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        Track now
      </a>
    </EmailLayout>
  );
}
