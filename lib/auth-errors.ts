/** Human-readable copy for Auth.js `error` query values on `/account`. */
export function describeAuthCallbackError(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    Configuration:
      "Auth is misconfigured (check AUTH_SECRET, AUTH_URL / NEXTAUTH_URL, and provider env vars on the server).",
    AccessDenied: "Sign-in was denied.",
    Verification: "The sign-in link is invalid or has expired. Request a new one.",
    OAuthSignin: "Could not start Google sign-in. Check Google OAuth client ID/secret and callback URL.",
    OAuthCallback:
      "Google sign-in failed after redirect. In Google Cloud Console → Credentials → your OAuth client, add Authorized redirect URI: https://YOUR_DOMAIN/api/auth/callback/google (use http://localhost:3000 for local dev).",
    OAuthCreateAccount: "Could not create an account with this Google profile.",
    EmailCreateAccount: "Could not create an account for this email.",
    Callback: "Something went wrong during sign-in.",
    OAuthAccountNotLinked:
      "This email is already used with another sign-in method. Use email/password or the original provider.",
    EmailSignin: "Could not send the sign-in email. Check RESEND_API_KEY and RESEND_FROM_EMAIL.",
    CredentialsSignin: "Invalid email or password.",
    SessionRequired: "You must be signed in.",
  };
  return map[code] ?? `Sign-in error: ${code}`;
}
