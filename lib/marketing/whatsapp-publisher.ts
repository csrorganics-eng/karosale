const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface WhatsAppShareLink {
  url: string;
  mobileUrl: string;
  text: string;
}

export function generateWhatsAppShareLink(text: string): WhatsAppShareLink {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return { url, mobileUrl: url, text };
}

export interface WhatsAppCloudApiOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  message: string;
}

export interface WhatsAppSendResult {
  messageId: string;
  success: true;
  to: string;
}

function parseWaError(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error?: { message?: string; code?: number } }).error;
    if (err?.message) return err.message;
  }
  return "WhatsApp Cloud API error";
}

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() && process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
  );
}

export async function sendWhatsAppMessage(
  options: WhatsAppCloudApiOptions,
): Promise<WhatsAppSendResult> {
  const url = `${GRAPH_API_BASE}/${options.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: options.to.replace(/\s/g, ""),
      type: "text",
      text: { body: options.message },
    }),
  });
  const json = (await res.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
  };
  if (!res.ok) {
    throw new Error(parseWaError(json));
  }
  const mid = json.messages?.[0]?.id;
  if (!mid) throw new Error(parseWaError(json));
  return { messageId: mid, success: true, to: options.to };
}

export async function sendBulkWhatsApp(
  recipients: string[],
  message: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp Cloud API is not configured");
  }
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const to of recipients) {
    try {
      await sendWhatsAppMessage({ phoneNumberId, accessToken, to, message });
      sent += 1;
    } catch (e) {
      failed += 1;
      errors.push(`${to}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return { sent, failed, errors };
}
