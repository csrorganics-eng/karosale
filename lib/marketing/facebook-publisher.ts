import { fetchImageAsBuffer } from "@/lib/marketing/image-generator";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface FacebookPublishOptions {
  pageId: string;
  pageAccessToken: string;
  message: string;
  imageUrl?: string;
}

export interface FacebookPublishResult {
  postId: string;
  success: true;
}

function parseFbError(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error?: { message?: string; code?: number } }).error;
    if (err?.message) {
      return err.code != null ? `[${err.code}] ${err.message}` : err.message;
    }
  }
  return "Facebook API error";
}

export async function exchangeForLongLivedToken(shortToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error("Facebook app credentials are not configured");
  }
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  const url = `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`;
  const res = await fetch(url, { method: "GET" });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string; code?: number };
  };
  if (!res.ok || !json.access_token) {
    throw new Error(parseFbError(json));
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 60 * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  return { accessToken: json.access_token, expiresAt };
}

export async function getPagesList(
  userAccessToken: string,
): Promise<Array<{ id: string; name: string; access_token: string }>> {
  const url = new URL(`${GRAPH_API_BASE}/me/accounts`);
  url.searchParams.set("access_token", userAccessToken);
  url.searchParams.set("fields", "id,name,access_token");
  const res = await fetch(url.toString());
  const json = (await res.json()) as {
    data?: Array<{ id: string; name: string; access_token: string }>;
    error?: { message?: string; code?: number };
  };
  if (!res.ok) {
    throw new Error(parseFbError(json));
  }
  return json.data ?? [];
}

export async function publishToFacebookPage(
  options: FacebookPublishOptions,
): Promise<FacebookPublishResult> {
  const { pageId, pageAccessToken, message, imageUrl } = options;

  if (imageUrl) {
    const buffer = await fetchImageAsBuffer(imageUrl);
    const form = new FormData();
    form.append(
      "source",
      new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }),
      "photo.jpg",
    );
    form.append("caption", message);
    form.append("published", "true");
    form.append("access_token", pageAccessToken);
    const res = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as {
      post_id?: string;
      id?: string;
      error?: { message?: string; code?: number };
    };
    if (!res.ok) {
      throw new Error(parseFbError(json));
    }
    const postId = json.post_id ?? json.id;
    if (!postId) throw new Error("Facebook did not return a post id");
    return { postId, success: true };
  }

  const body = new URLSearchParams({
    message,
    access_token: pageAccessToken,
  });
  const res = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string; code?: number } };
  if (!res.ok || !json.id) {
    throw new Error(parseFbError(json));
  }
  return { postId: json.id, success: true };
}
