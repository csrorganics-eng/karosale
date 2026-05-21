let authToken: string | null = null;
let tokenExpiry = 0;

async function getShiprocketToken(): Promise<string> {
  if (authToken && Date.now() < tokenExpiry) return authToken;

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new Error("Shiprocket credentials not configured");
  }

  const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Shiprocket auth failed: ${response.status}`);
  }

  const data = (await response.json()) as { token: string };
  authToken = data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
  return authToken;
}

export async function shiprocketFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getShiprocketToken();
  const response = await fetch(`https://apiv2.shiprocket.in/v1/external${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shiprocket API error: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function createShiprocketOrder(payload: Record<string, unknown>) {
  return shiprocketFetch<{ order_id: number; shipment_id: number }>(
    "/orders/create/adhoc",
    { method: "POST", body: JSON.stringify(payload) },
  );
}
