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

  const showGoogleSignIn =
    process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED === "true";

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
      <div className="mx-auto max-w-md px-4 py-16">
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
              <Button variant="outline" asChild>
                <Link href="/orders">My Orders</Link>
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
            <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
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
          <CardTitle>Sign In</CardTitle>
        </CardHeader>
        <CardContent>
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
            <div className={`space-y-2 ${showGoogleSignIn ? "mt-4" : "mt-6"}`}>
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
          </form>
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
