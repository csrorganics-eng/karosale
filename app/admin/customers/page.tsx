"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<
    Array<{
      name: string | null;
      email: string | null;
      phone: string | null;
      totalOrders: number;
      totalSpent: string;
      karmaTier: string;
    }>
  >([]);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCustomers(json.data.customers);
      });
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Customers</h1>
      <div className="mt-6 overflow-x-auto rounded-[14px] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
              <th className="p-4">Name</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Orders</th>
              <th className="p-4">Spent</th>
              <th className="p-4">Tier</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="p-4">{c.name}</td>
                <td className="p-4">
                  {c.email}
                  <br />
                  {c.phone}
                </td>
                <td className="p-4">{c.totalOrders}</td>
                <td className="p-4">{formatINR(parseFloat(c.totalSpent))}</td>
                <td className="p-4 capitalize">{c.karmaTier.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
