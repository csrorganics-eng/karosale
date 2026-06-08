/**
 * Idempotent seed for local dev and Vercel preview.
 * Run: npm run seed (loads `.env.local` / `.env` automatically; requires DATABASE_URL)
 */
import "./load-env-files";
import bcrypt from "bcryptjs";
import { eq, or, inArray, count, like, and, sql } from "drizzle-orm";
import { db } from "../lib/db/index";
import {
  categories,
  coupons,
  productImages,
  products,
  users,
  addresses,
  orders,
  orderItems,
  loyaltyTiers,
  pickLists,
  pickListItems,
  packagingTags,
} from "../lib/db/schema";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop";

async function main() {
  console.log("🌿 Seeding CSR Organics test data...");

  const tiers = [
    { name: "Seedling", minPoints: 0, maxPoints: 499, discountPct: "0", badgeLabel: "Seedling", badgeColor: "#A8D5BA" },
    { name: "Grower", minPoints: 500, maxPoints: 1999, discountPct: "3", badgeLabel: "Grower", badgeColor: "#6FAF8F" },
    { name: "Harvester", minPoints: 2000, maxPoints: 4999, discountPct: "5", badgeLabel: "Harvester", badgeColor: "#1e4d3a" },
    { name: "Master Farmer", minPoints: 5000, maxPoints: null, discountPct: "8", badgeLabel: "Master Farmer", badgeColor: "#1e4d3a" },
  ];

  for (const tier of tiers) {
    const [existing] = await db.select().from(loyaltyTiers).where(eq(loyaltyTiers.name, tier.name)).limit(1);
    if (!existing) await db.insert(loyaltyTiers).values(tier);
  }

  await db
    .update(loyaltyTiers)
    .set({ freeShippingOn: "299", updatedAt: new Date() })
    .where(eq(loyaltyTiers.name, "Harvester"));
  await db
    .update(loyaltyTiers)
    .set({
      perks: { alwaysFreeShipping: true },
      updatedAt: new Date(),
    })
    .where(eq(loyaltyTiers.name, "Master Farmer"));

  const passwordHash = await bcrypt.hash("QATester@123", 10);
  const adminHash = await bcrypt.hash("AdminQA@123", 10);
  const packerHash = await bcrypt.hash("PackerQA@123", 10);

  /** Keep QA logins working after email domain changes — match referral code or legacy/new email. */
  async function syncQaUser(opts: {
    email: string;
    matchEmails: string[];
    referralCode: string;
    passwordHash: string;
    name: string;
    phone: string;
    role: "customer" | "admin" | "packer";
    karmaPoints?: number;
    karmaTier?: "seedling" | "grower" | "harvester" | "master_farmer";
  }) {
    await db
      .update(users)
      .set({
        email: opts.email,
        passwordHash: opts.passwordHash,
        name: opts.name,
        phone: opts.phone,
        role: opts.role,
        isActive: true,
        emailVerified: new Date(),
        updatedAt: new Date(),
        ...(opts.karmaPoints != null ? { karmaPoints: opts.karmaPoints } : {}),
        ...(opts.karmaTier ? { karmaTier: opts.karmaTier } : {}),
      })
      .where(
        or(
          eq(users.referralCode, opts.referralCode),
          inArray(users.email, opts.matchEmails),
        ),
      );
  }

  await syncQaUser({
    email: "qa.tester@csrorganics.com",
    matchEmails: ["qa.tester@karosale.com", "qa.tester@csrorganics.com"],
    referralCode: "QA0001",
    passwordHash,
    name: "QA Tester",
    phone: "9999999901",
    role: "customer",
    karmaPoints: 250,
    karmaTier: "grower",
  });

  await syncQaUser({
    email: "admin.qa@csrorganics.com",
    matchEmails: ["admin.qa@karosale.com", "admin.qa@csrorganics.com"],
    referralCode: "ADM001",
    passwordHash: adminHash,
    name: "QA Admin",
    phone: "9999999902",
    role: "admin",
  });

  await syncQaUser({
    email: "packer.qa@csrorganics.com",
    matchEmails: ["packer.qa@karosale.com", "packer.qa@csrorganics.com"],
    referralCode: "PCK001",
    passwordHash: packerHash,
    name: "QA Packer",
    phone: "9999999903",
    role: "packer",
  });

  async function upsertUser(data: {
    email: string;
    name: string;
    phone: string;
    role: "customer" | "admin" | "packer";
    passwordHash: string;
    karmaPoints?: number;
    karmaTier?: "seedling" | "grower" | "harvester" | "master_farmer";
    referralCode: string;
  }) {
    const [existing] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        passwordHash: data.passwordHash,
        karmaPoints: data.karmaPoints ?? 0,
        karmaTier: data.karmaTier ?? "seedling",
        referralCode: data.referralCode,
        emailVerified: new Date(),
      })
      .returning();
    return created!;
  }

  const qaCustomer = await upsertUser({
    email: "qa.tester@csrorganics.com",
    name: "QA Tester",
    phone: "9999999901",
    role: "customer",
    passwordHash,
    karmaPoints: 250,
    karmaTier: "grower",
    referralCode: "QA0001",
  });

  await upsertUser({
    email: "admin.qa@csrorganics.com",
    name: "QA Admin",
    phone: "9999999902",
    role: "admin",
    passwordHash: adminHash,
    referralCode: "ADM001",
  });

  await upsertUser({
    email: "packer.qa@csrorganics.com",
    name: "QA Packer",
    phone: "9999999903",
    role: "packer",
    passwordHash: packerHash,
    referralCode: "PCK001",
  });

  const categoryData = [
    { name: "Vegetable Seeds", slug: "vegetable-seeds", icon: "🥕", sortOrder: 1 },
    { name: "Flower & Herb Seeds", slug: "flower-herb-seeds", icon: "🌸", sortOrder: 2 },
    { name: "Organic Manure & Compost", slug: "organic-manure", icon: "🌱", sortOrder: 3 },
    { name: "Grow Bags & Planters", slug: "grow-bags", icon: "🪴", sortOrder: 4 },
    { name: "Garden Tools", slug: "garden-tools", icon: "🔧", sortOrder: 5 },
    { name: "Organic Groceries", slug: "organic-groceries", icon: "🛒", sortOrder: 6 },
  ];

  const catIds: Record<string, string> = {};
  for (const cat of categoryData) {
    const [existing] = await db.select().from(categories).where(eq(categories.slug, cat.slug)).limit(1);
    if (existing) {
      catIds[cat.slug] = existing.id;
    } else {
      const [created] = await db.insert(categories).values({ ...cat, productCount: 0 }).returning();
      catIds[cat.slug] = created!.id;
    }
  }

  const productDefs = [
    { name: "Tomato Hybrid Seeds", slug: "tomato-hybrid-seeds", cat: "vegetable-seeds", price: "89", stock: 120, organic: true, featured: true, bestseller: true },
    { name: "Spinach Palak Seeds", slug: "spinach-palak-seeds", cat: "vegetable-seeds", price: "59", stock: 80, organic: true },
    { name: "Marigold Flower Seeds", slug: "marigold-seeds", cat: "flower-herb-seeds", price: "45", stock: 60, organic: false },
    { name: "Vermicompost 5kg", slug: "vermicompost-5kg", cat: "organic-manure", price: "299", stock: 45, organic: true, bestseller: true, compare: "349" },
    { name: "Cow Manure Organic 10kg", slug: "cow-manure-10kg", cat: "organic-manure", price: "199", stock: 3, organic: true, low: true },
    { name: "Grow Bag 12 inch", slug: "grow-bag-12", cat: "grow-bags", price: "79", stock: 200, organic: false },
    { name: "Garden Trowel Set", slug: "garden-trowel-set", cat: "garden-tools", price: "349", stock: 25, organic: false },
    { name: "Organic Turmeric 200g", slug: "organic-turmeric", cat: "organic-groceries", price: "149", stock: 0, organic: true, featured: true },
    { name: "Basil Herb Seeds", slug: "basil-herb-seeds", cat: "flower-herb-seeds", price: "55", stock: 90, organic: true },
    { name: "Neem Cake Fertilizer 2kg", slug: "neem-cake-2kg", cat: "organic-manure", price: "179", stock: 15, organic: true, expiry: true },
  ];

  let productCount = 0;
  for (const p of productDefs) {
    const [existing] = await db.select().from(products).where(eq(products.slug, p.slug)).limit(1);
    if (existing) continue;

    const expiryDate = p.expiry
      ? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      : undefined;

    const [created] = await db
      .insert(products)
      .values({
        categoryId: catIds[p.cat]!,
        name: p.name,
        slug: p.slug,
        shortDescription: `Premium quality ${p.name} for your organic garden.`,
        description: `<p>${p.name} — certified organic, carefully sourced for Indian climates.</p>`,
        price: p.price,
        comparePrice: p.compare ?? null,
        sku: `SKU-${p.slug.toUpperCase().slice(0, 12)}`,
        stockQty: p.stock,
        lowStockThreshold: 10,
        isOrganicCertified: p.organic ?? false,
        isFeatured: p.featured ?? false,
        isBestseller: p.bestseller ?? false,
        isSubscriptionEligible: p.cat === "organic-manure",
        expiryDate,
      })
      .returning();

    if (created) {
      productCount++;
      await db.insert(productImages).values({
        productId: created.id,
        url: PLACEHOLDER_IMAGE,
        altText: p.name,
        isPrimary: true,
        sortOrder: 0,
      });
    }
  }

  for (const slug of Object.keys(catIds)) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, catIds[slug]!));
    await db
      .update(categories)
      .set({ productCount: rows.length })
      .where(eq(categories.slug, slug));
  }

  /** 200 bulk catalog items for search / pagination / merchandising tests (idempotent by slug). */
  const catSlugOrder = [
    "vegetable-seeds",
    "flower-herb-seeds",
    "organic-manure",
    "grow-bags",
    "garden-tools",
    "organic-groceries",
  ];
  let bulkInserted = 0;
  for (let i = 1; i <= 200; i++) {
    const slug = `qa-bulk-${String(i).padStart(3, "0")}`;
    const [exists] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (exists) continue;
    const catSlug = catSlugOrder[(i - 1) % catSlugOrder.length]!;
    const catId = catIds[catSlug]!;
    const price = String(29 + (i % 170));
    const [created] = await db
      .insert(products)
      .values({
        categoryId: catId,
        name: `QA Bulk Item ${i}`,
        slug,
        shortDescription: `Seed bulk product ${i} for QA load testing.`,
        description: `<p>Bulk seed item ${i} — organic-friendly test SKU.</p>`,
        price,
        sku: `QA-BULK-${String(i).padStart(4, "0")}`,
        stockQty: 50 + (i % 100),
        lowStockThreshold: 10,
        isOrganicCertified: i % 3 === 0,
        isFeatured: i % 17 === 0,
        isBestseller: i % 23 === 0,
        isActive: true,
        totalSales: i % 40,
        avgRating: String((3 + (i % 20) / 10).toFixed(1)),
        reviewCount: i % 15,
      })
      .returning();
    if (created) {
      bulkInserted++;
      await db.insert(productImages).values({
        productId: created.id,
        url: PLACEHOLDER_IMAGE,
        altText: `QA Bulk Item ${i}`,
        isPrimary: true,
        sortOrder: 0,
      });
    }
  }
  if (bulkInserted > 0) {
    for (const slug of Object.keys(catIds)) {
      const rows = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.categoryId, catIds[slug]!));
      await db
        .update(categories)
        .set({ productCount: rows.length })
        .where(eq(categories.slug, slug));
    }
  }

  const couponDefs = [
    { code: "TESTSHIP", name: "Free Shipping Test", type: "free_shipping" as const, value: "0" },
    { code: "SAVE10", name: "10% Off", type: "percentage" as const, value: "10", min: "299" },
    { code: "WELCOME50", name: "Referral welcome", type: "flat" as const, value: "50", min: "0", referral: true },
  ];

  for (const c of couponDefs) {
    const [existing] = await db.select().from(coupons).where(eq(coupons.code, c.code)).limit(1);
    if (!existing) {
      await db.insert(coupons).values({
        code: c.code,
        name: c.name,
        type: c.type,
        value: c.value,
        minOrderValue: c.min ?? "0",
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        isReferralCoupon: Boolean((c as { referral?: boolean }).referral),
      });
    }
  }

  const [addr] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, qaCustomer.id))
    .limit(1);

  let addressId = addr?.id;
  if (!addressId) {
    const [created] = await db
      .insert(addresses)
      .values({
        userId: qaCustomer.id,
        name: "QA Tester",
        phone: "9999999901",
        line1: "123 Green Park",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110016",
        isDefault: true,
      })
      .returning();
    addressId = created?.id;
  }

  const allProducts = await db
    .select({ id: products.id, price: products.price, name: products.name, sku: products.sku })
    .from(products)
    .where(eq(products.isActive, true))
    .limit(80);

  const DUMMY_PACKAGING_PDF =
    "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  let ordersCreated = 0;
  let packagingReady = 0;

  if (addressId && allProducts.length >= 2) {
    const { generateOrderNumber } = await import("../lib/orders");

    const activeRows = await db
      .select({ activeCount: count() })
      .from(orders)
      .where(like(orders.notes, "SEED_DATA_ACTIVE_%"));
    const activeCount = Number(activeRows[0]?.activeCount ?? 0);

    const activeStatuses = [
      "pending",
      "pending",
      "confirmed",
      "confirmed",
      "confirmed",
      "processing",
      "processing",
      "packed",
      "packed",
      "out_for_delivery",
    ] as const;

    if (activeCount < 10) {
      for (let i = 0; i < 10; i++) {
        const note = `SEED_DATA_ACTIVE_${String(i + 1).padStart(2, "0")}`;
        const [dup] = await db.select({ id: orders.id }).from(orders).where(eq(orders.notes, note)).limit(1);
        if (dup) continue;

        const orderNumber = await generateOrderNumber();
        const p1 = allProducts[i % allProducts.length]!;
        const p2 = allProducts[(i + 2) % allProducts.length]!;
        const subtotal = parseFloat(p1.price) + parseFloat(p2.price) * 2;
        const total = subtotal;
        const st = activeStatuses[i]!;

        const [order] = await db
          .insert(orders)
          .values({
            orderNumber,
            userId: qaCustomer.id,
            addressId,
            status: st,
            paymentMethod: i % 2 === 0 ? "razorpay" : "cod",
            paymentStatus: st === "pending" ? "pending" : "captured",
            subtotal: String(subtotal),
            total: String(total),
            shippingCharge: "0",
            notes: note,
          })
          .returning();

        if (order) {
          ordersCreated++;
          await db.insert(orderItems).values([
            {
              orderId: order.id,
              productId: p1.id,
              productName: p1.name,
              productSku: p1.sku,
              qty: 1,
              unitPrice: p1.price,
              total: p1.price,
            },
            {
              orderId: order.id,
              productId: p2.id,
              productName: p2.name,
              productSku: p2.sku,
              qty: 2,
              unitPrice: p2.price,
              total: String(parseFloat(p2.price) * 2),
            },
          ]);
        }
      }
    }

    const pkgRows = await db
      .select({ pkgCount: count() })
      .from(orders)
      .where(like(orders.notes, "SEED_DATA_PKG_%"));
    const pkgCount = Number(pkgRows[0]?.pkgCount ?? 0);

    if (pkgCount < 5) {
      const today = new Date().toISOString().split("T")[0]!;
      const [existingList] = await db
        .select()
        .from(pickLists)
        .where(sql`${pickLists.date} = ${today}`)
        .limit(1);

      const pickListId =
        existingList?.id ??
        (await db.insert(pickLists).values({ date: today, status: "open" }).returning())[0]?.id;

      for (let i = 0; i < 5; i++) {
        const note = `SEED_DATA_PKG_${String(i + 1).padStart(2, "0")}`;
        const [dup] = await db.select({ id: orders.id }).from(orders).where(eq(orders.notes, note)).limit(1);
        if (dup) continue;

        const orderNumber = await generateOrderNumber();
        const p1 = allProducts[i % allProducts.length]!;
        const p2 = allProducts[(i + 3) % allProducts.length]!;
        const subtotal = parseFloat(p1.price) * 2 + parseFloat(p2.price);
        const total = subtotal;

        const [order] = await db
          .insert(orders)
          .values({
            orderNumber,
            userId: qaCustomer.id,
            addressId,
            status: "processing",
            paymentMethod: "cod",
            paymentStatus: "captured",
            subtotal: String(subtotal),
            total: String(total),
            shippingCharge: "0",
            notes: note,
            packagingTagUrl: DUMMY_PACKAGING_PDF,
          })
          .returning();

        if (!order) continue;
        ordersCreated++;
        packagingReady++;

        const lines = await db.insert(orderItems).values([
          {
            orderId: order.id,
            productId: p1.id,
            productName: p1.name,
            productSku: p1.sku,
            qty: 2,
            unitPrice: p1.price,
            total: String(parseFloat(p1.price) * 2),
          },
          {
            orderId: order.id,
            productId: p2.id,
            productName: p2.name,
            productSku: p2.sku,
            qty: 1,
            unitPrice: p2.price,
            total: p2.price,
          },
        ]).returning();

        const [tagExists] = await db
          .select({ id: packagingTags.id })
          .from(packagingTags)
          .where(eq(packagingTags.orderId, order.id))
          .limit(1);
        if (!tagExists) {
          await db.insert(packagingTags).values({
            orderId: order.id,
            barcodeString: `SEED-${order.orderNumber}`,
            tagData: {
              orderNumber: order.orderNumber,
              seeded: true,
              items: lines.map((l) => ({ sku: l.productSku, qty: l.qty })),
            },
            pdfUrl: DUMMY_PACKAGING_PDF,
            printCount: 1,
            printedAt: new Date(),
          });
        }

        if (pickListId) {
          const itemsRows = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          for (const it of itemsRows) {
            const [pli] = await db
              .select({ id: pickListItems.id })
              .from(pickListItems)
              .where(
                and(
                  eq(pickListItems.pickListId, pickListId),
                  eq(pickListItems.orderId, order.id),
                  eq(pickListItems.productId, it.productId),
                ),
              )
              .limit(1);
            if (pli) continue;
            await db.insert(pickListItems).values({
              pickListId,
              orderId: order.id,
              productId: it.productId,
              productName: it.productName,
              productSku: it.productSku,
              qtyRequired: it.qty,
            });
          }
        }
      }
    }
  }

  console.log(
    `✅ Seeded loyalty tiers, users, ${productCount} catalog products, ${bulkInserted} bulk QA products, ${ordersCreated} new seed orders (${packagingReady} packaging-ready w/ pick list + PDF), coupons`,
  );
  console.log("   Customer: qa.tester@csrorganics.com / QATester@123");
  console.log("   Admin:    admin.qa@csrorganics.com / AdminQA@123");
  console.log("   Packer:   packer.qa@csrorganics.com / PackerQA@123");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
