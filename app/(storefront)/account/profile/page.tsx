"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { BackToHome } from "@/components/storefront/BackToHome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WaitingSpinner } from "@/components/ui/waiting-overlay";

type Profile = {
  name: string | null;
  email: string | null;
  phone: string | null;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
};

type AddressRow = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  addressType: "home" | "work" | "other";
};

const emptyAddr: {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  addressType: "home" | "work" | "other";
  isDefault: boolean;
} = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  addressType: "home",
  isDefault: false,
};

function ProfilePageInner() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfter = searchParams.get("redirect");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(true);

  const [addrForm, setAddrForm] = useState(emptyAddr);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrMsg, setAddrMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    const [pRes, aRes] = await Promise.all([
      fetch("/api/account/profile"),
      fetch("/api/addresses"),
    ]);
    const pJson = await pRes.json();
    const aJson = await aRes.json();
    if (!pJson.success) {
      setLoadError(pJson.error ?? "Could not load profile");
      return;
    }
    const pr = pJson.data.profile as Profile;
    setProfile(pr);
    setName(pr.name ?? "");
    setPhone(pr.phone ?? "");
    setWhatsappOptIn(pr.whatsappOptIn);
    setEmailOptIn(pr.emailOptIn);
    if (aJson.success) {
      setAddresses(aJson.data.addresses as AddressRow[]);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/account?redirect=${encodeURIComponent("/account/profile")}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadAll();
  }, [status, loadAll]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          whatsappOptIn,
          emailOptIn,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setProfileMsg(json.error ?? "Save failed");
        return;
      }
      setProfile(json.data.profile as Profile);
      await update();
      setProfileMsg("Saved.");
    } finally {
      setSavingProfile(false);
    }
  }

  function startEdit(a: AddressRow) {
    setEditingId(a.id);
    setAddrForm({
      name: a.name,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      addressType: a.addressType,
      isDefault: a.isDefault,
    });
    setAddrMsg(null);
    window.scrollTo({ top: document.getElementById("address-form")?.offsetTop ?? 0, behavior: "smooth" });
  }

  function resetAddrForm() {
    setEditingId(null);
    setAddrForm({ ...emptyAddr, isDefault: addresses.length === 0 });
    setAddrMsg(null);
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddrBusy(true);
    setAddrMsg(null);
    try {
      const payload = {
        ...addrForm,
        line2: addrForm.line2.trim() || undefined,
        isDefault: addrForm.isDefault || addresses.length === 0,
      };
      const url = editingId ? `/api/addresses/${editingId}` : "/api/addresses";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setAddrMsg(json.error ?? "Could not save address");
        return;
      }
      await loadAll();
      resetAddrForm();
      setAddrMsg("Address saved.");
      if (redirectAfter) {
        router.push(redirectAfter);
      }
    } finally {
      setAddrBusy(false);
    }
  }

  async function removeAddress(id: string) {
    if (!confirm("Remove this address?")) return;
    setAddrBusy(true);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        setAddrMsg(json.error ?? "Delete failed");
        return;
      }
      await loadAll();
      if (editingId === id) resetAddrForm();
    } finally {
      setAddrBusy(false);
    }
  }

  async function setDefault(id: string) {
    setAddrBusy(true);
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const json = await res.json();
      if (!json.success) {
        setAddrMsg(json.error ?? "Update failed");
        return;
      }
      await loadAll();
    } finally {
      setAddrBusy(false);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <WaitingSpinner label="Loading profile…" size="lg" />
      </div>
    );
  }

  if (!profile && !loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <WaitingSpinner label="Loading profile…" size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <BackToHome />
        <p className="text-error">{loadError}</p>
        <Button className="mt-4" asChild variant="outline">
          <Link href="/account">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <BackToHome />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Your profile</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Keep your details current for faster checkout and order updates.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/account">Account home</Link>
        </Button>
      </div>

      {redirectAfter && (
        <div className="mb-6 rounded-[length:var(--radius-card)] border border-primary/30 bg-accent-soft/50 px-4 py-3 text-sm">
          After you save a delivery address you will return to{" "}
          <span className="font-medium">{redirectAfter}</span>.
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full name</label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input className="mt-1" value={profile?.email ?? ""} disabled readOnly />
              <p className="mt-1 text-xs text-text-secondary">Email is tied to your sign-in. Use magic link or support to change it.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Mobile (optional)</label>
              <Input
                className="mt-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number for delivery SMS"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2 rounded-[10px] border border-border bg-surface-subtle p-4">
              <p className="text-sm font-medium">Notifications</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} />
                Order updates on WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
                Offers and tips by email
              </label>
            </div>
            {profileMsg && <p className="text-sm text-text-secondary">{profileMsg}</p>}
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save personal details"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6" id="address-form">
        <CardHeader>
          <CardTitle>Delivery addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {addresses.length > 0 && (
            <ul className="space-y-3">
              {addresses.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 rounded-[10px] border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="text-sm">
                    <p className="font-medium">
                      {a.name}
                      {a.isDefault && (
                        <span className="ml-2 rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">Default</span>
                      )}
                    </p>
                    <p className="text-text-secondary">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                    </p>
                    <p className="text-text-secondary">
                      {a.city}, {a.state} {a.pincode}
                    </p>
                    <p className="text-text-secondary">{a.phone}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!a.isDefault && (
                      <Button type="button" size="sm" variant="outline" disabled={addrBusy} onClick={() => setDefault(a.id)}>
                        Set default
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="outline" disabled={addrBusy} onClick={() => startEdit(a)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={addrBusy} onClick={() => removeAddress(a.id)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm font-medium">{editingId ? "Edit address" : "Add address"}</p>
          <form onSubmit={saveAddress} className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Full name"
              value={addrForm.name}
              onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })}
              required
              className="sm:col-span-2"
            />
            <Input
              placeholder="Phone"
              value={addrForm.phone}
              onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
              required
              className="sm:col-span-2"
            />
            <Input
              placeholder="Address line 1"
              value={addrForm.line1}
              onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
              required
              className="sm:col-span-2"
            />
            <Input
              placeholder="Address line 2 (optional)"
              value={addrForm.line2}
              onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })}
              className="sm:col-span-2"
            />
            <Input placeholder="City" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} required />
            <Input placeholder="State" value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} required />
            <Input
              placeholder="PIN code (6 digits)"
              value={addrForm.pincode}
              onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
              required
              maxLength={6}
              inputMode="numeric"
              className="sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={addrForm.isDefault}
                onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
              />
              Use as default delivery address
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={addrBusy}>
                {addrBusy ? "Saving…" : editingId ? "Update address" : "Save address"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" disabled={addrBusy} onClick={resetAddrForm}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
          {addrMsg && <p className="text-sm text-text-secondary">{addrMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment & security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-secondary">
          <p>
            We never store full card numbers on our servers. Online payments run through{" "}
            <a href="https://razorpay.com" className="text-primary underline" target="_blank" rel="noopener noreferrer">
              Razorpay
            </a>{" "}
            (cards, UPI, netbanking, wallets) at checkout. Your bank may show “Razorpay” on the statement.
          </p>
          <p>Use a strong, unique password for this shop. Signed in as <strong className="text-text-primary">{session?.user?.email}</strong>.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/orders">View order history</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16">
          <WaitingSpinner label="Loading…" size="lg" />
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}
