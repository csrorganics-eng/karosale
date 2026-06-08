import { EmailLayout } from "./base-layout";

export function OrderDeliveredEmail(props: {
  orderNumber: string;
  reviewUrl: string;
}) {
  return (
    <EmailLayout preview="Your order was delivered">
      <h2 style={{ margin: "0 0 8px", color: "#1e4d3a" }}>
        Delivered! Enjoy your organic products 🌿
      </h2>
      <p>Order {props.orderNumber} has been delivered. How was your experience?</p>
      <p style={{ fontSize: "24px", letterSpacing: "4px" }}>★★★★★</p>
      <p style={{ fontSize: "14px", color: "#5C6B62" }}>Earn 5 karma points when you leave a review.</p>
      <a
        href={props.reviewUrl}
        style={{
          display: "inline-block",
          marginTop: "16px",
          backgroundColor: "#1e4d3a",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        Write a review
      </a>
    </EmailLayout>
  );
}
