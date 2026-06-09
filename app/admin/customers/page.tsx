"use client";

import { useEffect, useState } from "react";
import { AdminTableShell, ADMIN_DATA_TABLE_CLASS } from "@/components/admin/AdminTableShell";
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
    <div className="min-w-0">
      <h1 className="font-display text-2xl font-bold">Customers</h1>
      <AdminTableShell className="mt-4 sm:mt-6">
        <table className={ADMIN_DATA_TABLE_CLASS}>
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
              <th>Name</th>
              <th>Contact</th>
              <th>Orders</th>
              <th>Spent</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={i} className="border-b border-border/50">
                <td>{c.name}</td>
                <td className="break-words">
                  {c.email}
                  <br />
                  {c.phone}
                </td>
                <td>{c.totalOrders}</td>
                <td>{formatINR(parseFloat(c.totalSpent))}</td>
                <td className="capitalize">{c.karmaTier.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}
