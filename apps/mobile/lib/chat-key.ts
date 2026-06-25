/**
 * Persistent client key used to identify chat sessions.
 * Equivalent of the web app's localStorage "csr_shop_chat_client_key".
 * Stored in SecureStore so it survives app restarts.
 */
import * as SecureStore from "expo-secure-store";

const KEY = "csr_shop_chat_client_key";

function generateKey(): string {
  // 24 random hex chars — safe UUID-style key
  const bytes = new Uint8Array(12);
  // Use Math.random as a fallback (crypto.getRandomValues not always available in hermes)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getOrCreateChatClientKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing && existing.length >= 8) return existing;

  const newKey = generateKey();
  await SecureStore.setItemAsync(KEY, newKey);
  return newKey;
}
