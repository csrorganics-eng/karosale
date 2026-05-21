"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  const { data: session, status } = useSession();
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
    if (result?.error) setError("Invalid email or password");
  }

  if (status === "loading") {
    return <div className="mx-auto max-w-md px-4 py-16 text-center">Loading...</div>;
  }

  if (session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
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
                <a href="/orders">My Orders</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/wishlist">Wishlist</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/loyalty">Karma Rewards</a>
              </Button>
              {session.user.role === "admin" && (
                <Button asChild>
                  <a href="/admin/dashboard">Admin Dashboard</a>
                </Button>
              )}
              {(session.user.role === "packer" || session.user.role === "admin") && (
                <Button variant="secondary" asChild>
                  <a href="/packer/picklist">Packer Pick List</a>
                </Button>
              )}
            </div>
            <Button variant="ghost" onClick={() => signOut()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
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
            QA: qa.tester@karosale.com / QATester@123
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
