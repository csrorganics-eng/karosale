export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.warn("[Fast2SMS] API key not configured");
    return false;
  }

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: otp,
      numbers: cleanPhone,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fast2SMS error: ${text}`);
  }

  const data = (await response.json()) as { return?: boolean };
  return data.return === true;
}
