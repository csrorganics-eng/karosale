const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function check(path: string, expectStatus = 200) {
  const res = await fetch(`${base}${path}`);
  const ok = res.status === expectStatus;
  console.log(`${ok ? "✓" : "✗"} ${path} → ${res.status}`);
  return ok;
}

async function main() {
  console.log(`Smoke tests against ${base}\n`);
  const results = await Promise.all([
    check("/api/health"),
    check("/api/products"),
    check("/api/categories"),
    check("/api/admin/dashboard", 401),
    check("/api/loyalty/balance", 401),
  ]);
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
