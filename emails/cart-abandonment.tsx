import { EmailLayout } from "./base-layout";

export function CartAbandonmentEmail(props: {
  items: Array<{ name: string; price: string }>;
  checkoutUrl: string;
  couponCode?: string;
}) {
  return (
    <EmailLayout preview="You left something behind">
      <h2 style={{ margin: "0 0 8px", color: "#1e4d3a" }}>You left something behind 🌱</h2>
      <ul style={{ paddingLeft: "20px" }}>
        {props.items.map((item, i) => (
          <li key={i}>
            {item.name} — ₹{item.price}
          </li>
        ))}
      </ul>
      {props.couponCode && (
        <p>
          Use code <strong>{props.couponCode}</strong> at checkout.
        </p>
      )}
      <a
        href={props.checkoutUrl}
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
        Complete your order
      </a>
    </EmailLayout>
  );
}
