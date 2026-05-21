"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BackToHome } from "@/components/storefront/BackToHome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AccountPageContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [email, setEmail] = useState("qa.tester@karosale.com");
  const [password, setPassword] = useState("QATester@123");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await signIn("credentials", {
      email,
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
              />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-text-secondary">
            QA admin: admin.qa@karosale.com / AdminQA@123
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
