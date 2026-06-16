import { relations, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  bigserial,
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// --- Enums ---
export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "admin",
  "vendor",
  "packer",
]);

export const karmaTierEnum = pgEnum("karma_tier", [
  "seedling",
  "grower",
  "harvester",
  "master_farmer",
]);

export const addressTypeEnum = pgEnum("address_type", ["home", "work", "other"]);

export const certificationTypeEnum = pgEnum("certification_type", [
  "npop",
  "india_organic",
  "fssai",
  "other",
]);

export const inventoryTypeEnum = pgEnum("inventory_type", [
  "purchase",
  "sale",
  "adjustment",
  "return",
  "damage",
  "expiry",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "razorpay",
  "cod",
  "wallet",
  "upi",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
]);

export const couponTypeEnum = pgEnum("coupon_type", [
  "percentage",
  "flat",
  "free_shipping",
  "buy_x_get_y",
]);

export const loyaltyTransactionTypeEnum = pgEnum("loyalty_transaction_type", [
  "earned",
  "redeemed",
  "expired",
  "bonus",
  "referral",
]);

export const subscriptionFrequencyEnum = pgEnum("subscription_frequency", [
  "weekly",
  "fortnightly",
  "monthly",
  "bimonthly",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "cancelled",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "whatsapp",
  "email",
  "sms",
  "push",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sent",
  "delivered",
  "failed",
  "bounced",
]);

export const pickListStatusEnum = pgEnum("pick_list_status", [
  "open",
  "in_progress",
  "completed",
]);

export const vendorBusinessTypeEnum = pgEnum("vendor_business_type", [
  "individual",
  "company",
  "farm",
]);

export const vendorFulfillmentEnum = pgEnum("vendor_fulfillment", ["self", "platform"]);

export const vendorKycStatusEnum = pgEnum("vendor_kyc_status", [
  "pending",
  "submitted",
  "verified",
  "rejected",
]);

export const vendorPayoutStatusEnum = pgEnum("vendor_payout_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);

export const b2bInquiryStatusEnum = pgEnum("b2b_inquiry_status", [
  "new",
  "contacted",
  "quoted",
  "converted",
  "lost",
]);

// --- Auth.js adapter tables ---
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    phone: varchar("phone", { length: 20 }),
    name: varchar("name", { length: 255 }),
    image: varchar("image", { length: 500 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: userRoleEnum("role").default("customer").notNull(),
    whatsappOptIn: boolean("whatsapp_opt_in").default(true).notNull(),
    emailOptIn: boolean("email_opt_in").default(true).notNull(),
    karmaPoints: integer("karma_points").default(0).notNull(),
    karmaTier: karmaTierEnum("karma_tier").default("seedling").notNull(),
    referralCode: varchar("referral_code", { length: 12 }),
    referredBy: uuid("referred_by"),
    totalOrders: integer("total_orders").default(0).notNull(),
    totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0").notNull(),
    lastOrderedAt: timestamp("last_ordered_at", { mode: "date" }),
    isActive: boolean("is_active").default(true).notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    geminiPersonalizationProfile: jsonb("gemini_personalization_profile"),
    geminiPersonalizationProfileAt: timestamp("gemini_personalization_profile_at", {
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_phone_idx").on(table.phone),
    uniqueIndex("users_referral_code_idx").on(table.referralCode),
    index("users_role_idx").on(table.role),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_tokens_identifier_token_idx").on(
      table.identifier,
      table.token,
    ),
  ],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: varchar("phone", { length: 20 }).notNull(),
    code: varchar("code", { length: 6 }).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    verified: boolean("verified").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("otp_codes_phone_idx").on(table.phone)],
);

// --- Addresses ---
export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    line1: varchar("line1", { length: 500 }).notNull(),
    line2: varchar("line2", { length: 500 }),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    pincode: varchar("pincode", { length: 10 }).notNull(),
    country: varchar("country", { length: 2 }).default("IN").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    addressType: addressTypeEnum("address_type").default("home").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("addresses_user_id_idx").on(table.userId)],
);

// --- Vendors (Phase 3 ready) ---
export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    businessType: vendorBusinessTypeEnum("business_type").default("individual").notNull(),
    gstin: varchar("gstin", { length: 20 }),
    fssaiLicense: varchar("fssai_license", { length: 50 }),
    description: text("description"),
    logoUrl: varchar("logo_url", { length: 500 }),
    website: varchar("website", { length: 500 }),
    commissionPct: decimal("commission_pct", { precision: 5, scale: 2 }).default("15").notNull(),
    qualityScore: decimal("quality_score", { precision: 3, scale: 2 }).default("5.0").notNull(),
    fulfillmentType: vendorFulfillmentEnum("fulfillment_type").default("self").notNull(),
    bankAccount: jsonb("bank_account"),
    kycStatus: vendorKycStatusEnum("kyc_status").default("pending").notNull(),
    kycDocuments: jsonb("kyc_documents"),
    isActive: boolean("is_active").default(false).notNull(),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    approvedBy: uuid("approved_by").references(() => users.id),
    totalGmv: decimal("total_gmv", { precision: 12, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vendors_user_id_idx").on(table.userId),
    uniqueIndex("vendors_slug_idx").on(table.slug),
    index("vendors_kyc_status_idx").on(table.kycStatus),
    index("vendors_is_active_idx").on(table.isActive),
  ],
);

// --- Catalog ---
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id"),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    imageUrl: varchar("image_url", { length: 500 }),
    icon: varchar("icon", { length: 100 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    productCount: integer("product_count").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("categories_slug_idx").on(table.slug),
    index("categories_parent_id_idx").on(table.parentId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    shortDescription: text("short_description").notNull(),
    description: text("description").notNull(),
    aiDescription: text("ai_description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
    /** Optional merchandising % off (0–100). Shown on cards when set; MRP/compare still drives strike-through. */
    promotionalDiscountPct: decimal("promotional_discount_pct", { precision: 5, scale: 2 }),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
    sku: varchar("sku", { length: 100 }).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    weightGrams: integer("weight_grams"),
    lengthCm: decimal("length_cm", { precision: 6, scale: 2 }),
    widthCm: decimal("width_cm", { precision: 6, scale: 2 }),
    heightCm: decimal("height_cm", { precision: 6, scale: 2 }),
    stockQty: integer("stock_qty").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(10).notNull(),
    isOrganicCertified: boolean("is_organic_certified").default(false).notNull(),
    certificationType: certificationTypeEnum("certification_type"),
    certificationDocUrl: varchar("certification_doc_url", { length: 500 }),
    expiryDate: date("expiry_date"),
    isSubscriptionEligible: boolean("is_subscription_eligible").default(false).notNull(),
    subscriptionDiscountPct: decimal("subscription_discount_pct", {
      precision: 5,
      scale: 2,
    })
      .default("10")
      .notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isBestseller: boolean("is_bestseller").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    totalSales: integer("total_sales").default(0).notNull(),
    avgRating: decimal("avg_rating", { precision: 3, scale: 2 }).default("0").notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    schemaMarkup: jsonb("schema_markup"),
    searchVector: text("search_vector"),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    uniqueIndex("products_sku_idx").on(table.sku),
    index("products_category_id_idx").on(table.categoryId),
    index("products_vendor_id_idx").on(table.vendorId),
    index("products_is_active_idx").on(table.isActive),
    index("products_is_featured_idx").on(table.isFeatured),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 500 }).notNull(),
    altText: varchar("alt_text", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("product_images_product_id_idx").on(table.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    stockQty: integer("stock_qty").default(0).notNull(),
    attributes: jsonb("attributes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    uniqueIndex("product_variants_sku_idx").on(table.sku),
  ],
);

export const inventoryLog = pgTable(
  "inventory_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    type: inventoryTypeEnum("type").notNull(),
    qtyChange: integer("qty_change").notNull(),
    qtyBefore: integer("qty_before").notNull(),
    qtyAfter: integer("qty_after").notNull(),
    referenceId: uuid("reference_id"),
    referenceType: varchar("reference_type", { length: 50 }),
    note: text("note"),
    performedBy: uuid("performed_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("inventory_log_product_id_idx").on(table.productId)],
);

// --- Cart ---
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 255 }),
    couponCode: varchar("coupon_code", { length: 30 }),
    couponDiscount: decimal("coupon_discount", { precision: 10, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("carts_user_id_idx").on(table.userId),
    index("carts_session_id_idx").on(table.sessionId),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    qty: integer("qty").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    isSubscription: boolean("is_subscription").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("cart_items_cart_id_idx").on(table.cartId)],
);

// --- Orders ---
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 20 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    addressId: uuid("address_id")
      .notNull()
      .references(() => addresses.id),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    status: orderStatusEnum("status").default("pending").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
    razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
    razorpaySignature: varchar("razorpay_signature", { length: 255 }),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    couponCode: varchar("coupon_code", { length: 30 }),
    couponDiscount: decimal("coupon_discount", { precision: 10, scale: 2 }).default("0").notNull(),
    karmaPointsUsed: integer("karma_points_used").default(0).notNull(),
    karmaDiscount: decimal("karma_discount", { precision: 10, scale: 2 }).default("0").notNull(),
    shippingCharge: decimal("shipping_charge", { precision: 10, scale: 2 }).default("0").notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    shiprocketOrderId: varchar("shiprocket_order_id", { length: 100 }),
    shiprocketShipmentId: varchar("shiprocket_shipment_id", { length: 100 }),
    awbCode: varchar("awb_code", { length: 50 }),
    courierName: varchar("courier_name", { length: 100 }),
    trackingUrl: varchar("tracking_url", { length: 500 }),
    estimatedDelivery: date("estimated_delivery"),
    packagingTagUrl: varchar("packaging_tag_url", { length: 500 }),
    shippingLabelUrl: varchar("shipping_label_url", { length: 500 }),
    invoiceUrl: varchar("invoice_url", { length: 500 }),
    codVerified: boolean("cod_verified").default(false).notNull(),
    codVerifiedAt: timestamp("cod_verified_at", { mode: "date" }),
    notes: text("notes"),
    adminNotes: text("admin_notes"),
    packedAt: timestamp("packed_at", { mode: "date" }),
    shippedAt: timestamp("shipped_at", { mode: "date" }),
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    cancelledAt: timestamp("cancelled_at", { mode: "date" }),
    cancellationReason: text("cancellation_reason"),
    isGift: boolean("is_gift").default(false).notNull(),
    giftMessage: text("gift_message"),
    /** Set at checkout from affiliate tracking cookie / manual code (FK applied in DB migration). */
    affiliateId: integer("affiliate_id"),
    affiliateDiscountAmount: decimal("affiliate_discount_amount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
    index("orders_payment_status_idx").on(table.paymentStatus),
    index("orders_created_at_idx").on(table.createdAt),
    index("orders_affiliate_id_idx").on(table.affiliateId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    productName: varchar("product_name", { length: 255 }).notNull(),
    productSku: varchar("product_sku", { length: 100 }).notNull(),
    productImage: varchar("product_image", { length: 500 }),
    qty: integer("qty").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    packedQty: integer("packed_qty").default(0).notNull(),
    isReturned: boolean("is_returned").default(false).notNull(),
    returnReason: text("return_reason"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).notNull(),
    note: text("note"),
    changedBy: uuid("changed_by").references(() => users.id),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("order_status_history_order_id_idx").on(table.orderId)],
);

// --- Fulfillment ---
export const packagingTags = pgTable(
  "packaging_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    barcodeString: varchar("barcode_string", { length: 100 }).notNull(),
    tagData: jsonb("tag_data").notNull(),
    pdfUrl: varchar("pdf_url", { length: 500 }),
    printedAt: timestamp("printed_at", { mode: "date" }),
    printCount: integer("print_count").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("packaging_tags_order_id_idx").on(table.orderId)],
);

export const pickLists = pgTable(
  "pick_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    status: pickListStatusEnum("status").default("open").notNull(),
    assignedTo: uuid("assigned_to").references(() => users.id),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("pick_lists_date_idx").on(table.date)],
);

export const pickListItems = pgTable(
  "pick_list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pickListId: uuid("pick_list_id")
      .notNull()
      .references(() => pickLists.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    productName: varchar("product_name", { length: 255 }).notNull(),
    productSku: varchar("product_sku", { length: 100 }).notNull(),
    qtyRequired: integer("qty_required").notNull(),
    qtyPicked: integer("qty_picked").default(0).notNull(),
    location: varchar("location", { length: 100 }),
    isCompleted: boolean("is_completed").default(false).notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("pick_list_items_pick_list_id_idx").on(table.pickListId)],
);

// --- Promotions ---
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: couponTypeEnum("type").notNull(),
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }).default("0").notNull(),
    maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").default(0).notNull(),
    perUserLimit: integer("per_user_limit").default(1).notNull(),
    applicableCategories: uuid("applicable_categories").array(),
    applicableProducts: uuid("applicable_products").array(),
    applicableUserIds: uuid("applicable_user_ids").array(),
    startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    isActive: boolean("is_active").default(true).notNull(),
    isReferralCoupon: boolean("is_referral_coupon").default(false).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("coupons_code_idx").on(table.code)],
);

export const couponUsage = pgTable(
  "coupon_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("coupon_usage_coupon_id_idx").on(table.couponId)],
);

// --- Loyalty ---
export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  minPoints: integer("min_points").notNull(),
  maxPoints: integer("max_points"),
  discountPct: decimal("discount_pct", { precision: 5, scale: 2 }).default("0").notNull(),
  freeShippingOn: decimal("free_shipping_on", { precision: 10, scale: 2 }),
  badgeLabel: varchar("badge_label", { length: 100 }).notNull(),
  badgeColor: varchar("badge_color", { length: 20 }).notNull(),
  perks: jsonb("perks"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: loyaltyTransactionTypeEnum("type").notNull(),
    points: integer("points").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    referenceId: uuid("reference_id"),
    referenceType: varchar("reference_type", { length: 50 }),
    description: text("description").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("loyalty_transactions_user_id_idx").on(table.userId)],
);

// --- Subscriptions ---
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    qty: integer("qty").default(1).notNull(),
    frequency: subscriptionFrequencyEnum("frequency").notNull(),
    nextOrderDate: date("next_order_date").notNull(),
    discountPct: decimal("discount_pct", { precision: 5, scale: 2 }).default("10").notNull(),
    status: subscriptionStatusEnum("status").default("active").notNull(),
    lastOrderId: uuid("last_order_id").references(() => orders.id),
    totalOrdersCreated: integer("total_orders_created").default(0).notNull(),
    razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 100 }),
    cancelledAt: timestamp("cancelled_at", { mode: "date" }),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("subscriptions_user_id_idx").on(table.userId)],
);

// --- Reviews ---
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    rating: smallint("rating").notNull(),
    title: varchar("title", { length: 100 }),
    body: text("body").notNull(),
    pros: text("pros"),
    cons: text("cons"),
    isVerifiedPurchase: boolean("is_verified_purchase").default(true).notNull(),
    helpfulCount: integer("helpful_count").default(0).notNull(),
    notHelpfulCount: integer("not_helpful_count").default(0).notNull(),
    status: reviewStatusEnum("status").default("pending").notNull(),
    adminReply: text("admin_reply"),
    adminRepliedAt: timestamp("admin_replied_at", { mode: "date" }),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("reviews_product_id_idx").on(table.productId),
    index("reviews_user_id_idx").on(table.userId),
  ],
);

export const reviewImages = pgTable(
  "review_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 500 }).notNull(),
    altText: varchar("alt_text", { length: 255 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("review_images_review_id_idx").on(table.reviewId)],
);

// --- Wishlist ---
export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("wishlists_user_product_idx").on(table.userId, table.productId),
  ],
);

// --- Notifications ---
export const notificationsLog = pgTable(
  "notifications_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    orderId: uuid("order_id").references(() => orders.id),
    channel: notificationChannelEnum("channel").notNull(),
    templateName: varchar("template_name", { length: 100 }).notNull(),
    payload: jsonb("payload"),
    status: notificationStatusEnum("status").default("queued").notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    sentAt: timestamp("sent_at", { mode: "date" }),
    deliveredAt: timestamp("delivered_at", { mode: "date" }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("notifications_log_order_id_idx").on(table.orderId)],
);

// --- Cart abandonment ---
export const cartAbandonment = pgTable(
  "cart_abandonment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    cartSnapshot: jsonb("cart_snapshot").notNull(),
    cartValue: decimal("cart_value", { precision: 10, scale: 2 }).notNull(),
    step1SentAt: timestamp("step_1_sent_at", { mode: "date" }),
    step2SentAt: timestamp("step_2_sent_at", { mode: "date" }),
    step3SentAt: timestamp("step_3_sent_at", { mode: "date" }),
    recoveredAt: timestamp("recovered_at", { mode: "date" }),
    recoveredOrderId: uuid("recovered_order_id").references(() => orders.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("cart_abandonment_user_id_idx").on(table.userId)],
);

// --- Search & analytics ---
export const searchQueries = pgTable(
  "search_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    query: varchar("query", { length: 255 }).notNull(),
    resultsCount: integer("results_count").default(0).notNull(),
    clickedProductId: uuid("clicked_product_id").references(() => products.id),
    userId: uuid("user_id").references(() => users.id),
    sessionId: varchar("session_id", { length: 255 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("search_queries_query_idx").on(table.query)],
);

export const pageViews = pgTable(
  "page_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    path: varchar("path", { length: 500 }).notNull(),
    productId: uuid("product_id").references(() => products.id),
    userId: uuid("user_id").references(() => users.id),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    referrer: varchar("referrer", { length: 500 }),
    userAgent: varchar("user_agent", { length: 500 }),
    country: varchar("country", { length: 2 }),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("page_views_path_idx").on(table.path),
    index("page_views_session_id_idx").on(table.sessionId),
  ],
);

// --- Vendor payouts ---
export const vendorPayouts = pgTable(
  "vendor_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    orderCount: integer("order_count").default(0).notNull(),
    grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
    commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
    platformFees: decimal("platform_fees", { precision: 10, scale: 2 }).default("0").notNull(),
    netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
    status: vendorPayoutStatusEnum("status").default("pending").notNull(),
    paidAt: timestamp("paid_at", { mode: "date" }),
    razorpayPayoutId: varchar("razorpay_payout_id", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("vendor_payouts_vendor_id_idx").on(table.vendorId)],
);

// --- Bundles ---
export const productBundles = pgTable(
  "product_bundles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").notNull(),
    imageUrl: varchar("image_url", { length: 500 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("product_bundles_slug_idx").on(table.slug)],
);

export const bundleItems = pgTable(
  "bundle_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => productBundles.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    qty: integer("qty").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("bundle_items_bundle_id_idx").on(table.bundleId)],
);

// --- Merchandising: search ranking & A/B tests ---
export const searchRankingSettings = pgTable("search_ranking_settings", {
  id: uuid("id").primaryKey(),
  matchNameWeight: decimal("match_name_weight", { precision: 12, scale: 4 }).notNull(),
  matchDescWeight: decimal("match_desc_weight", { precision: 12, scale: 4 }).notNull(),
  matchSkuWeight: decimal("match_sku_weight", { precision: 12, scale: 4 }).notNull(),
  salesLogCoef: decimal("sales_log_coef", { precision: 12, scale: 4 }).notNull(),
  ratingCoef: decimal("rating_coef", { precision: 12, scale: 4 }).notNull(),
  reviewCountCoef: decimal("review_count_coef", { precision: 12, scale: 4 }).notNull(),
  featuredBonus: decimal("featured_bonus", { precision: 12, scale: 4 }).notNull(),
  bestsellerBonus: decimal("bestseller_bonus", { precision: 12, scale: 4 }).notNull(),
  inStockBonus: decimal("in_stock_bonus", { precision: 12, scale: 4 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const abExperiments = pgTable(
  "ab_experiments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    segment: varchar("segment", { length: 32 }).default("all").notNull(),
    trafficBPercent: integer("traffic_b_percent").default(50).notNull(),
    variantAConfig: jsonb("variant_a_config").default({}).notNull(),
    variantBConfig: jsonb("variant_b_config").default({}).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ab_experiments_slug_idx").on(table.slug),
    index("ab_experiments_active_idx").on(table.isActive),
  ],
);

// --- Marketing campaigns (Phase 2) ---
export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    campaignType: varchar("campaign_type", { length: 32 }).notNull().default("flash_sale"),
    targetSegment: varchar("target_segment", { length: 40 }).notNull().default("all"),
    couponCode: varchar("coupon_code", { length: 30 }),
    notificationBody: text("notification_body"),
    startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { mode: "date" }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("campaigns_active_idx").on(table.isActive),
    index("campaigns_dates_idx").on(table.startsAt, table.endsAt),
  ],
);

// --- B2B ---
export const b2bInquiries = pgTable(
  "b2b_inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    gstin: varchar("gstin", { length: 20 }),
    productsRequired: jsonb("products_required"),
    totalQtyApprox: integer("total_qty_approx"),
    message: text("message").notNull(),
    status: b2bInquiryStatusEnum("status").default("new").notNull(),
    assignedTo: uuid("assigned_to").references(() => users.id),
    quotedAmount: decimal("quoted_amount", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("b2b_inquiries_status_idx").on(table.status)],
);

// --- Shop AI chat ---
export const shopChatSessions = pgTable(
  "shop_chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientKey: varchar("client_key", { length: 80 }).notNull().unique(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("shop_chat_sessions_user_id_idx").on(table.userId)],
);

export const shopChatMessages = pgTable(
  "shop_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => shopChatSessions.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("shop_chat_messages_session_id_idx").on(table.sessionId)],
);

export const shopChatEscalations = pgTable("shop_chat_escalations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => shopChatSessions.id, { onDelete: "cascade" }),
  userEmail: text("user_email"),
  reason: text("reason").notNull(),
  lastUserMessage: text("last_user_message"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// --- AI Marketing Content Studio ---
export const marketingCampaigns = pgTable(
  "marketing_campaigns",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    postText: text("post_text").notNull(),
    /** Shorter WhatsApp copy; when null, publish uses post_text as the base for WA. */
    whatsappText: text("whatsapp_text"),
    /** `product` = catalog SKU campaign; `event` = announcement with description (no product). */
    campaignKind: text("campaign_kind").notNull().default("product"),
    /** Linked catalog product when campaign_kind is product (optional for legacy rows). */
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    /** When campaign_kind is event: short headline stored with the campaign. */
    eventTitle: text("event_title"),
    eventDescription: text("event_description"),
    /** Optional uploaded / external HTTPS image used as Flux reference for event campaigns. */
    eventReferenceImageUrl: text("event_reference_image_url"),
    /** Banner shape for optional banner: 16:9 | 9:16 | 1:1 */
    bannerAspect: text("banner_aspect").notNull().default("16:9"),
    imagePrompt: text("image_prompt"),
    imageUrl: text("image_url"),
    /** Optional wide banner (e.g. 1200×630) for link previews / Facebook. */
    bannerImagePrompt: text("banner_image_prompt"),
    bannerImageUrl: text("banner_image_url"),
    /** Optional extra direction merged into Flux/Pollinations prompts on regenerate (not shown in post). */
    imageRefinementPrompt: text("image_refinement_prompt"),
    /** Storefront product URL (product campaigns); null for events. */
    productPageUrl: text("product_page_url"),
    /** Link-in-bio / ad landing URL — event: usually homepage; product: often same as product page or UTM variant. */
    redirectUrl: text("redirect_url"),
    platforms: text("platforms")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    facebookPostId: text("facebook_post_id"),
    instagramPostId: text("instagram_post_id"),
    whatsappRecipients: integer("whatsapp_recipients").default(0),
    errorLog: text("error_log"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("marketing_campaigns_created_by_idx").on(table.createdBy),
    index("marketing_campaigns_status_idx").on(table.status),
    index("marketing_campaigns_product_id_idx").on(table.productId),
  ],
);

/** Single-row config: optional premium hero strip on the public storefront homepage. */
export const siteHomepageBanner = pgTable("site_homepage_banner", {
  singleton: text("singleton").primaryKey().default("default"),
  imageUrl: text("image_url"),
  /** Matches Marketing Studio / admin aspect used when the image was generated (16:9, 9:16, 1:1). */
  bannerAspect: text("banner_aspect").notNull().default("16:9"),
  linkHref: text("link_href"),
  headline: text("headline"),
  subheadline: text("subheadline"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const socialConnections = pgTable(
  "social_connections",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    accessToken: text("access_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { mode: "date" }),
    pageId: text("page_id"),
    pageName: text("page_name"),
    igUserId: text("ig_user_id"),
    whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("social_connections_user_provider_idx").on(table.userId, table.provider),
    index("social_connections_user_id_idx").on(table.userId),
  ],
);

export const whatsappRecipientGroups = pgTable("whatsapp_recipient_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phoneNumbers: text("phone_numbers")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// --- Affiliate program ---
export const affiliateSettings = pgTable("affiliate_settings", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  defaultCommissionType: varchar("default_commission_type", { length: 10 }).default("percent").notNull(),
  defaultCommissionValue: decimal("default_commission_value", { precision: 10, scale: 4 })
    .default("5")
    .notNull(),
  secondOrderCommissionEnabled: boolean("second_order_commission_enabled").default(false).notNull(),
  secondOrderCommissionValue: decimal("second_order_commission_value", { precision: 10, scale: 4 })
    .default("2")
    .notNull(),
  newCustomerDiscountEnabled: boolean("new_customer_discount_enabled").default(false).notNull(),
  newCustomerDiscountType: varchar("new_customer_discount_type", { length: 10 })
    .default("percent")
    .notNull(),
  newCustomerDiscountValue: decimal("new_customer_discount_value", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),
  newCustomerDiscountMaxUses: integer("new_customer_discount_max_uses"),
  commissionTrigger: varchar("commission_trigger", { length: 20 }).default("order_complete").notNull(),
  multitierEnabled: boolean("multitier_enabled").default(false).notNull(),
  tier1CommissionValue: decimal("tier1_commission_value", { precision: 10, scale: 4 }).default("5").notNull(),
  tier2CommissionValue: decimal("tier2_commission_value", { precision: 10, scale: 4 }).default("2").notNull(),
  tier3CommissionValue: decimal("tier3_commission_value", { precision: 10, scale: 4 }).default("1").notNull(),
  tier4CommissionValue: decimal("tier4_commission_value", { precision: 10, scale: 4 }).default("0.5").notNull(),
  tierCommissionType: varchar("tier_commission_type", { length: 10 }).default("percent").notNull(),
  registrationCommissionEnabled: boolean("registration_commission_enabled").default(false).notNull(),
  registrationCommissionValue: decimal("registration_commission_value", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),
  allowGrabReferrer: boolean("allow_grab_referrer").default(false).notNull(),
  cookieDurationDays: integer("cookie_duration_days").default(7).notNull(),
  minPayoutAmount: decimal("min_payout_amount", { precision: 10, scale: 2 }).default("500").notNull(),
  payoutMethod: varchar("payout_method", { length: 20 }).default("razorpay").notNull(),
  autoPayoutEnabled: boolean("auto_payout_enabled").default(false).notNull(),
  autoPayoutThreshold: decimal("auto_payout_threshold", { precision: 10, scale: 2 }).default("1000").notNull(),
  popupEnabled: boolean("popup_enabled").default(true).notNull(),
  popupBgColor: varchar("popup_bg_color", { length: 7 }).default("#2D6A4F").notNull(),
  popupTextColor: varchar("popup_text_color", { length: 7 }).default("#FFFFFF").notNull(),
  popupShowSocialShare: boolean("popup_show_social_share").default(true).notNull(),
  popupSocialNetworks: text("popup_social_networks")
    .array()
    .notNull()
    .default(sql`ARRAY['whatsapp','facebook','twitter','instagram']::text[]`),
  excludedProductIds: uuid("excluded_product_ids")
    .array()
    .notNull()
    .default(sql`ARRAY[]::uuid[]`),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const affiliates = pgTable(
  "affiliates",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    referredByAffiliateId: integer("referred_by_affiliate_id").references(
      (): AnyPgColumn => affiliates.id,
      { onDelete: "set null" },
    ),
    tierLevel: integer("tier_level").default(1).notNull(),
    totalEarned: decimal("total_earned", { precision: 12, scale: 2 }).default("0").notNull(),
    totalPaid: decimal("total_paid", { precision: 12, scale: 2 }).default("0").notNull(),
    walletBalance: decimal("wallet_balance", { precision: 12, scale: 2 }).default("0").notNull(),
    razorpayContactId: varchar("razorpay_contact_id", { length: 50 }),
    razorpayFundAccountId: varchar("razorpay_fund_account_id", { length: 50 }),
    bankAccountNumber: varchar("bank_account_number", { length: 30 }),
    bankIfsc: varchar("bank_ifsc", { length: 15 }),
    bankAccountName: varchar("bank_account_name", { length: 100 }),
    upiId: varchar("upi_id", { length: 100 }),
    emailNotificationsEnabled: boolean("email_notifications_enabled").default(true).notNull(),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    approvedByAdminId: uuid("approved_by_admin_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("affiliates_username_idx").on(table.username),
    index("affiliates_user_id_idx").on(table.userId),
    index("affiliates_status_idx").on(table.status),
    index("affiliates_referred_by_idx").on(table.referredByAffiliateId),
  ],
);

export const affiliateTrackingLinks = pgTable(
  "affiliate_tracking_links",
  {
    id: serial("id").primaryKey(),
    affiliateId: integer("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    customSlug: varchar("custom_slug", { length: 100 }),
    fullUrl: text("full_url").notNull(),
    clickCount: integer("click_count").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("affiliate_tracking_links_affiliate_id_idx").on(table.affiliateId)],
);

export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    affiliateId: integer("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    visitorId: varchar("visitor_id", { length: 64 }),
    converted: boolean("converted").default(false).notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("affiliate_clicks_affiliate_id_idx").on(table.affiliateId),
    index("affiliate_clicks_created_at_idx").on(table.createdAt),
  ],
);

export const affiliateReferrals = pgTable(
  "affiliate_referrals",
  {
    id: serial("id").primaryKey(),
    affiliateId: integer("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    referredUserId: uuid("referred_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referralType: varchar("referral_type", { length: 20 }).default("purchase").notNull(),
    discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).default("0").notNull(),
    registrationCommissionPaid: boolean("registration_commission_paid").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("affiliate_referrals_referred_user_id_idx").on(table.referredUserId),
    index("affiliate_referrals_affiliate_id_idx").on(table.affiliateId),
  ],
);

export const affiliatePayouts = pgTable(
  "affiliate_payouts",
  {
    id: serial("id").primaryKey(),
    affiliateId: integer("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    requestedAmount: decimal("requested_amount", { precision: 12, scale: 2 }).notNull(),
    approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
    status: varchar("status", { length: 20 }).default("requested").notNull(),
    payoutMethod: varchar("payout_method", { length: 20 }).default("razorpay").notNull(),
    bankAccountNumber: varchar("bank_account_number", { length: 30 }),
    bankIfsc: varchar("bank_ifsc", { length: 15 }),
    upiId: varchar("upi_id", { length: 100 }),
    razorpayPayoutId: varchar("razorpay_payout_id", { length: 50 }),
    razorpayPayoutStatus: varchar("razorpay_payout_status", { length: 30 }),
    razorpayReferenceId: varchar("razorpay_reference_id", { length: 100 }),
    razorpayUtr: varchar("razorpay_utr", { length: 50 }),
    reviewedByAdminId: uuid("reviewed_by_admin_id"),
    adminNotes: text("admin_notes"),
    rejectionReason: text("rejection_reason"),
    requestedAt: timestamp("requested_at", { mode: "date" }).defaultNow().notNull(),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    processedAt: timestamp("processed_at", { mode: "date" }),
    paidAt: timestamp("paid_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("affiliate_payouts_affiliate_id_idx").on(table.affiliateId),
    index("affiliate_payouts_status_idx").on(table.status),
  ],
);

export const affiliateCommissions = pgTable(
  "affiliate_commissions",
  {
    id: serial("id").primaryKey(),
    affiliateId: integer("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    referredUserId: uuid("referred_user_id").references(() => users.id, { onDelete: "set null" }),
    tierLevel: integer("tier_level").default(1).notNull(),
    commissionType: varchar("commission_type", { length: 10 }).default("percent").notNull(),
    commissionRate: decimal("commission_rate", { precision: 10, scale: 4 }).notNull(),
    orderSubtotal: decimal("order_subtotal", { precision: 12, scale: 2 }).notNull(),
    commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    payoutId: integer("payout_id").references(() => affiliatePayouts.id, { onDelete: "set null" }),
    cancelledReason: text("cancelled_reason"),
    cancelledByAdmin: uuid("cancelled_by_admin"),
    cancelledAt: timestamp("cancelled_at", { mode: "date" }),
    triggerEvent: varchar("trigger_event", { length: 30 }).default("order_complete").notNull(),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("affiliate_commissions_order_affiliate_tier_idx").on(
      table.orderId,
      table.affiliateId,
      table.tierLevel,
    ),
    index("affiliate_commissions_affiliate_id_idx").on(table.affiliateId),
    index("affiliate_commissions_order_id_idx").on(table.orderId),
    index("affiliate_commissions_status_idx").on(table.status),
  ],
);

export const affiliateProductOverrides = pgTable(
  "affiliate_product_overrides",
  {
    id: serial("id").primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    isExcluded: boolean("is_excluded").default(false).notNull(),
    commissionType: varchar("commission_type", { length: 10 }),
    commissionValue: decimal("commission_value", { precision: 10, scale: 4 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("affiliate_product_overrides_product_id_idx").on(table.productId)],
);

export const affiliateProgramTiers = pgTable("affiliate_program_tiers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  minSalesAmount: decimal("min_sales_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  commissionBonus: decimal("commission_bonus", { precision: 10, scale: 4 }).default("0").notNull(),
  badgeColor: varchar("badge_color", { length: 7 }).default("#CD7F32").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const affiliateMonthlySummary = pgTable(
  "affiliate_monthly_summary",
  {
    id: serial("id").primaryKey(),
    affiliateId: integer("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    totalClicks: integer("total_clicks").default(0).notNull(),
    totalOrders: integer("total_orders").default(0).notNull(),
    totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0").notNull(),
    totalCommission: decimal("total_commission", { precision: 12, scale: 2 }).default("0").notNull(),
    totalPaid: decimal("total_paid", { precision: 12, scale: 2 }).default("0").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("affiliate_monthly_summary_affiliate_period_idx").on(
      table.affiliateId,
      table.year,
      table.month,
    ),
  ],
);

// --- Relations ---
export const usersRelations = relations(users, ({ one, many }) => ({
  referredByUser: one(users, {
    fields: [users.referredBy],
    references: [users.id],
    relationName: "referrals",
  }),
  addresses: many(addresses),
  orders: many(orders),
  carts: many(carts),
  reviews: many(reviews),
  wishlists: many(wishlists),
  loyaltyTransactions: many(loyaltyTransactions),
  subscriptions: many(subscriptions),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_tree",
  }),
  children: many(categories, { relationName: "category_tree" }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  vendor: one(vendors, { fields: [products.vendorId], references: [vendors.id] }),
  images: many(productImages),
  variants: many(productVariants),
  reviews: many(reviews),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  address: one(addresses, { fields: [orders.addressId], references: [addresses.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  packagingTag: one(packagingTags),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  images: many(reviewImages),
}));

// --- Type exports ---
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
