"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BackToHome } from "@/components/storefront/BackToHome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { describeAuthCallbackError } from "@/lib/auth-errors";

function AccountPageContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [email, setEmail] = useState("qa.tester@csrorganics.com");
  const [password, setPassword] = useState("QATester@123");
  const [magicEmail, setMagicEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regName, setRegName] = useState("");
  const [regBusy, setRegBusy] = useState(false);

  const showGoogleSignIn =
    process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED === "true";

  const [referral, setReferral] = useState<{
    shareUrl: string | null;
    whatsappUrl: string | null;
    invited: number;
    ordered: number;
  } | null>(null);

  useEffect(() => {
    if (session?.user) {
      void fetch("/api/referral/stats")
        .then((r) => r.json())
        .then((j) => {
          if (j.success)
            setReferral({
              shareUrl: j.data.shareUrl,
              whatsappUrl: j.data.whatsappUrl,
              invited: j.data.invited,
              ordered: j.data.ordered,
            });
        })
        .catch(() => undefined);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const errCode = searchParams.get("error");
    const described = describeAuthCallbackError(errCode);
    if (described) setError(described);
  }, [searchParams]);

  useEffect(() => {
    if (session?.user) {
      void fetch("/api/referral/claim", { method: "POST" }).catch(() => undefined);
    }
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- claim once per user id

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = email.trim().toLowerCase();
    const result = await signIn("credentials", {
      email: normalized,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    await update();

    if (redirectTo) {
      router.push(redirectTo);
      return;
    }
    router.refresh();
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <BackToHome />
        Loading...
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <BackToHome />
        <Card>
          <CardHeader>
            <CardTitle>My Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-secondary">
              Signed in as <strong>{session.user.email}</strong>
            </p>
            <p className="text-sm text-text-secondary">Role: {session.user.role}</p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/account/profile">My profile & addresses</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/orders">My Orders</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/subscriptions">My Subscriptions</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/wishlist">Wishlist</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/loyalty">Karma Rewards</Link>
              </Button>
              {session.user.role === "admin" && (
                <Button asChild>
                  <Link href="/admin/dashboard">Admin Dashboard</Link>
                </Button>
              )}
              {(session.user.role === "packer" || session.user.role === "admin") && (
                <Button variant="secondary" asChild>
                  <Link href="/packer/picklist">Packer Pick List</Link>
                </Button>
              )}
            </div>
            {referral?.shareUrl && (
              <div className="rounded-[length:var(--radius-card)] border border-border bg-accent-soft/40 p-4">
                <p className="text-sm font-semibold text-text-primary">Referral program</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Invited {referral.invited} · Friends with orders {referral.ordered}
                </p>
                <p className="mt-2 break-all font-mono text-xs text-text-secondary">{referral.shareUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(referral.shareUrl!);
                    }}
                  >
                    Copy link
                  </Button>
                  {referral.whatsappUrl && (
                    <Button size="sm" variant="secondary" asChild>
                      <a href={referral.whatsappUrl} target="_blank" rel="noopener noreferrer">
                        Share on WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut({ redirect: false });
                // Avoid default sign-out redirect: it uses AUTH_URL / NEXTAUTH_URL, which on Vercel
                // can point at a removed preview and show DEPLOYMENT_NOT_FOUND. Same-origin navigation is safe.
                window.location.replace(`${window.location.origin}/`);
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <BackToHome />
      <Card>
        <CardHeader>
          <CardTitle>{authMode === "signin" ? "Sign In" : "Create account"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2 rounded-[10px] border border-border bg-surface-subtle p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                authMode === "signin" ? "bg-surface shadow-sm" : "text-text-secondary"
              }`}
              onClick={() => {
                setAuthMode("signin");
                setError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                authMode === "register" ? "bg-surface shadow-sm" : "text-text-secondary"
              }`}
              onClick={() => {
                setAuthMode("register");
                setError(null);
              }}
            >
              New account
            </button>
          </div>

          {authMode === "signin" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <Button type="submit" className="w-full">
                Sign In
              </Button>
              {showGoogleSignIn && (
                <>
                  <div className="relative my-4 text-center text-xs text-text-secondary">
                    <span className="bg-surface px-2">or</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setError(null);
                      void signIn("google", { callbackUrl: redirectTo ?? "/" });
                    }}
                  >
                    Continue with Google
                  </Button>
                </>
              )}
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                const addr = regEmail.trim().toLowerCase();
                if (regPassword !== regConfirm) {
                  setError("Passwords do not match");
                  return;
                }
                if (regPassword.length < 8) {
                  setError("Password must be at least 8 characters");
                  return;
                }
                setRegBusy(true);
                try {
                  const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: addr,
                      password: regPassword,
                      name: regName.trim() || undefined,
                    }),
                  });
                  const json = await res.json();
                  if (!json.success) {
                    setError(json.error ?? "Registration failed");
                    return;
                  }
                  const result = await signIn("credentials", {
                    email: addr,
                    password: regPassword,
                    redirect: false,
                  });
                  if (result?.error) {
                    setError("Account created but sign-in failed. Try signing in manually.");
                    return;
                  }
                  await update();
                  if (redirectTo) {
                    router.push(redirectTo);
                    return;
                  }
                  router.push("/account/profile");
                  router.refresh();
                } finally {
                  setRegBusy(false);
                }
              }}
            >
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="mt-1"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Display name (optional)</label>
                <Input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="mt-1"
                  autoComplete="name"
                  placeholder="How we greet you"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="mt-1"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confirm password</label>
                <Input
                  type="password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  className="mt-1"
                  required
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <Button type="submit" className="w-full" disabled={regBusy}>
                {regBusy ? "Creating account…" : "Create account & sign in"}
              </Button>
              <p className="text-xs text-text-secondary">
                After sign-up, add a delivery address on your profile so checkout is one step faster.
              </p>
            </form>
          )}

          <div className={`space-y-2 border-t border-border pt-4 ${showGoogleSignIn ? "mt-4" : "mt-6"}`}>
            <p className="text-center text-xs font-medium text-text-secondary">Passwordless sign-in</p>
            <Input
              type="email"
              placeholder="Email for magic link"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              autoComplete="email"
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={magicBusy}
              onClick={async () => {
                const addr = magicEmail.trim().toLowerCase();
                if (!addr) return;
                setMagicBusy(true);
                setError(null);
                setMagicSent(false);
                try {
                  const res = await signIn("email", {
                    email: addr,
                    callbackUrl: redirectTo ?? "/",
                    redirect: false,
                  });
                  if (res?.error) {
                    setError(
                      res.error === "EmailSignin"
                        ? describeAuthCallbackError("EmailSignin")
                        : res.error,
                    );
                    return;
                  }
                  setMagicSent(true);
                } finally {
                  setMagicBusy(false);
                }
              }}
            >
              {magicBusy ? "Sending…" : "Email me a sign-in link"}
            </Button>
            {magicSent && (
              <p className="text-sm text-success">
                Check your inbox for a sign-in link. It may take a minute to arrive.
              </p>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-text-secondary">
            QA admin: admin.qa@csrorganics.com / AdminQA@123
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center">Loading...</div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}
