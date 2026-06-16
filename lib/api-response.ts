import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/** Cart / account-sensitive payloads — never allow browser or intermediary caching. */
export function jsonOkPrivateNoStore<T>(data: T, status = 200) {
  const res = NextResponse.json({ success: true, data }, { status });
  res.headers.set("Cache-Control", "private, no-store, must-revalidate");
  return res;
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, details },
    { status },
  );
}
