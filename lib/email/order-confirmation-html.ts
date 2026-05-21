import type { OrderConfirmationEmailProps } from "@/emails/order-confirmation";

export function buildOrderConfirmationHtml(props: OrderConfirmationEmailProps): string {
  const itemsHtml = props.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0">${item.name}</td><td style="text-align:right">${item.qty}</td><td style="text-align:right">₹${item.price}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#F5F9F6;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E2EDE6">
<div style="background:#1B4332;color:#fff;padding:24px;text-align:center"><h1 style="margin:0">Karosale</h1></div>
<div style="padding:24px;color:#1A2E1F">
<h2 style="color:#1B4332">Thank you for your order! 🌿</h2>
<p>Hi ${props.customerName}, we've received your order.</p>
<p><strong>Order:</strong> ${props.orderNumber}<br><strong>Date:</strong> ${props.orderDate}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${itemsHtml}</table>
<p>Subtotal: ₹${props.subtotal}${parseFloat(props.discount) > 0 ? ` · Discount: -₹${props.discount}` : ""}</p>
<p style="font-size:18px;font-weight:700;color:#1B4332">Total: ₹${props.total}</p>
<p><strong>Deliver to:</strong><br>${props.addressLine}</p>
<a href="${props.trackUrl}" style="display:inline-block;margin-top:20px;background:#1B4332;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Track your order</a>
</div></div></body></html>`;
}
