const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface InstagramPublishOptions {
  igUserId: string;
  pageAccessToken: string;
  caption: string;
  imageUrl: string;
}

export interface InstagramPublishResult {
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
  return "Instagram API error";
}

async function waitForContainerReady(
  containerId: string,
  accessToken: string,
): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const url = new URL(`${GRAPH_API_BASE}/${containerId}`);
    url.searchParams.set("fields", "status_code");
    url.searchParams.set("access_token", accessToken);
    const res = await fetch(url.toString());
    const json = (await res.json()) as {
      status_code?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(parseFbError(json));
    }
    const code = json.status_code;
    if (code === "FINISHED") return;
    if (code === "ERROR") {
      throw new Error("Instagram media processing failed");
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Instagram media processing timed out");
}

export async function publishToInstagram(
  options: InstagramPublishOptions,
): Promise<InstagramPublishResult> {
  const { igUserId, pageAccessToken, caption, imageUrl } = options;

  const createParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: pageAccessToken,
  });
  const createRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createParams.toString(),
  });
  const createJson = (await createRes.json()) as {
    id?: string;
    error?: { message?: string; code?: number };
  };
  if (!createRes.ok || !createJson.id) {
    throw new Error(parseFbError(createJson));
  }
  const containerId = createJson.id;

  await waitForContainerReady(containerId, pageAccessToken);

  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: pageAccessToken,
  });
  const publishRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams.toString(),
  });
  const publishJson = (await publishRes.json()) as {
    id?: string;
    error?: { message?: string; code?: number };
  };
  if (!publishRes.ok || !publishJson.id) {
    throw new Error(parseFbError(publishJson));
  }
  return { postId: publishJson.id, success: true };
}

export async function getLinkedInstagramAccount(
  pageId: string,
  pageAccessToken: string,
): Promise<{ igUserId: string; username: string } | null> {
  const url = new URL(`${GRAPH_API_BASE}/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account{id,username}");
  url.searchParams.set("access_token", pageAccessToken);
  const res = await fetch(url.toString());
  const json = (await res.json()) as {
    instagram_business_account?: { id?: string; username?: string };
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(parseFbError(json));
  }
  const ig = json.instagram_business_account;
  if (!ig?.id) return null;
  return { igUserId: ig.id, username: ig.username ?? "" };
}
