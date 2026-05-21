const INTERAKT_BASE = "https://api.interakt.ai/v1/public";

export async function sendWhatsAppMessage(params: {
  phoneNumber: string;
  templateName: string;
  bodyValues: string[];
  headerValues?: string[];
}) {
  const apiKey = process.env.INTERAKT_API_KEY;
  if (!apiKey) {
    console.warn("[Interakt] API key not configured — skipping WhatsApp");
    return { skipped: true };
  }

  const phone = params.phoneNumber.replace(/\D/g, "");
  const countryCode = phone.startsWith("91") ? phone : `91${phone}`;

  const response = await fetch(`${INTERAKT_BASE}/message/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      countryCode: "+91",
      phoneNumber: countryCode.replace(/^91/, ""),
      type: "Template",
      template: {
        name: params.templateName,
        languageCode: "en",
        bodyValues: params.bodyValues,
        headerValues: params.headerValues ?? [],
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Interakt error: ${response.status} ${text}`);
  }

  return response.json();
}

export const WHATSAPP_TEMPLATES = {
  ORDER_CONFIRMED: "order_confirmed",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
  ADMIN_NEW_ORDER: "admin_new_order",
  CART_ABANDONED: "cart_abandoned",
  REVIEW_REQUEST: "review_request",
  LOW_STOCK: "low_stock_alert",
} as const;
